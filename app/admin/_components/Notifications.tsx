'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { Card, FieldLabel, T, XIcon, apiFetch, inputStyle } from '../_lib/shared'

export function NotificationsTab() {
  const initialForm = {
    title: '',
    message: '',
    type: 'modal',
    scheduled_for: '',
    image_url: '',
    image_position: 'top',
    expires_at: '',
    audience: 'all',
    steps: [] as any[]
  }

  const [form, setForm] = useState(initialForm)
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [list, setList] = useState<any[]>([])

  const load = async () => {
    const r = await apiFetch('/v2/admin/notifications')
    if (r.ok) setList(r.data || [])
  }

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [...(f.steps || []), { title: '', message: '', image_url: '' }]
    }))
  }

  const updateStep = (index: number, key: string, value: string) => {
    setForm(f => {
      const steps = [...f.steps]
      steps[index][key] = value
      return { ...f, steps }
    })
  }

  const removeStep = (index: number) => {
    setForm(f => ({
      ...f,
      steps: f.steps.filter((_: any, i: number) => i !== index)
    }))
  }

  useEffect(() => { load() }, [])

  const toggle = async (id: string, active: boolean) => {
    const r = await apiFetch(`/v2/admin/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ active })
    })

    if (r.ok) {
      setList(l =>
        l.map(n => n.id === id ? { ...n, active } : n)
      )
    }
  }

  const startEdit = (n: any) => {
    setEditingId(n.id)
    setForm({
      title: n.title || '',
      message: n.message || '',
      type: n.type || 'modal',
      scheduled_for: n.scheduled_for
        ? new Date(n.scheduled_for).toISOString().slice(0, 16)
        : '',
      image_url: n.image_url || '',
      image_position: n.image_position || 'top',
      expires_at: n.expires_at
        ? new Date(n.expires_at).toISOString().slice(0, 16)
        : '',
      audience: n.audience || 'all',
      steps: Array.isArray(n.steps) ? n.steps : [],
    })

    // Scroll composer into view on small screens
    if (typeof window !== 'undefined' && window.scrollTo) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(initialForm)
  }

  const send = async () => {
    // Validate: need either a non-empty message OR a fully-populated steps array
    const hasValidSteps =
      Array.isArray(form.steps) &&
      form.steps.length > 0 &&
      form.steps.every((s: any) => s?.title?.trim() && s?.message?.trim())

    const hasMessage = !!form.message?.trim()

    if (!hasValidSteps && !hasMessage) {
      toast.error(
        form.steps?.length
          ? 'Each step needs a title and message'
          : 'Message or steps required'
      )
      return
    }

    setSending(true)

    const payload = {
      ...form,
      scheduled_for: form.scheduled_for || null,
      expires_at: form.expires_at || null,
      steps: hasValidSteps ? form.steps : null,
      message: hasValidSteps ? null : form.message,
    }

    const url = editingId
      ? `/v2/admin/notifications/${editingId}`
      : `/v2/admin/notifications`
    const method = editingId ? 'PATCH' : 'POST'

    const r = await apiFetch(url, {
      method,
      body: JSON.stringify(payload),
    })

    if (r.ok) {
      toast.success(editingId ? 'Notification updated' : 'Notification sent')
      setEditingId(null)
      setForm(initialForm)
      await load()
    } else {
      toast.error(r.error || 'Failed')
    }

    setSending(false)
  }

  const IS = inputStyle()

  // Panel section label style (uppercase small caps)
  const sectionLabel: React.CSSProperties = {
    fontSize: 'var(--bs-text-2xs)',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
    marginBottom: 12,
  }

  // Sub-panel (step cards) style
  const stepPanelStyle: React.CSSProperties = {
    background: T.elevated,
    border: `1px solid ${T.border}`,
    borderRadius: 'var(--bs-radius-lg)',
    padding: 14,
    marginBottom: 10,
  }

  // History row styles
  const typeBadgeStyle = (type: string): React.CSSProperties => {
    const color =
      type === 'modal' ? T.accent :
      type === 'banner' ? T.warning :
      T.success
    return {
      display: 'inline-flex',
      alignItems: 'center',
      height: 22,
      padding: '0 10px',
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color,
      background: `rgba(var(--bs-${type === 'modal' ? 'accent' : type === 'banner' ? 'warning' : 'success'}-rgb), 0.15)`,
      border: `1px solid rgba(var(--bs-${type === 'modal' ? 'accent' : type === 'banner' ? 'warning' : 'success'}-rgb), 0.25)`,
    }
  }

  const statusPillStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 22,
    padding: '0 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color: active ? T.success : T.textMuted,
    background: active
      ? 'rgba(var(--bs-success-rgb), 0.12)'
      : 'rgba(var(--bs-muted-rgb, 100,100,110), 0.15)',
    border: active
      ? '1px solid rgba(var(--bs-success-rgb), 0.22)'
      : `1px solid ${T.border}`,
  })

  const settingsInputStyle = {
    height: 44,
    padding: '0 14px',
    background: 'var(--bs-bg-input)',
    border: '1px solid var(--bs-border-default)',
    borderRadius: 'var(--bs-radius-md)',
    color: 'var(--bs-text-primary)',
    fontSize: 13,
    width: '100%',
  }
  
  const primaryBtn = {
    height: 48,
    background: 'var(--bs-accent-fill)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--bs-radius-lg)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer'
  }

  return (
    // Was a hard two-column grid, so the composer and the preview/history
    // column each got half of a 360px screen. auto-fit collapses it to one
    // column below ~760px. This is the pattern seven other admin grids already
    // use (OverviewTab :1246 and :1256, ProductsTab, CustomersTab :2564,
    // PartnersTab :3006, AdsTab :4566, DiscountsTab :4676) — no media query and
    // no new mechanism; admin still has zero @media rules.
    //
    // The gap drops from 24 (space-6, the CUSTOMER section step) to space-4,
    // which is the admin section gap in the density table. That, plus the Card
    // wrappers below, is what made this tab read as more padded than its
    // siblings: every other tab returns a bare <div> and sits flush against
    // .bs-admin, while this one nests everything in Card's space-5/space-6.
    // `min(340px, 100%)` rather than a bare 340px: auto-fit collapses to one
    // track below ~760px, but a bare floor keeps that single track 340px wide,
    // and the container here is 297px at a 360 viewport — so the column stopped
    // wrapping and started overflowing instead. Measured: 19px of document
    // overflow. The min() lets the last track shrink to the container.
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 'var(--bs-space-4)', alignItems: 'start' }}>
      <style>{`
        .bs-notif-input:focus,
        .bs-notif-input:focus-visible {
          outline: none !important;
          border-color: var(--bs-accent) !important;
        }
        .bs-notif-step-remove:hover {
          color: var(--bs-error) !important;
          border-color: rgba(var(--bs-error-rgb), 0.4) !important;
          background: rgba(var(--bs-error-rgb), 0.06) !important;
        }
        .bs-notif-add-step:hover {
          border-color: var(--bs-accent) !important;
          /* Was #fff on an 8% accent TINT — white on near-white in light mode,
             about 1.05:1, i.e. the label vanished on hover. Sixth instance of
             the on-tint bug and the only one where the text was white rather
             than the accent itself. A tint is not a fill: --bs-accent-fill
             would be wrong here too, since the background stays translucent. */
          color: color-mix(in srgb, var(--bs-accent), var(--bs-on-tint-mix)) !important;
          background: rgba(var(--bs-accent-rgb), 0.08) !important;
        }
      `}</style>

      {/* ============================================================ */}
      {/* LEFT COLUMN — COMPOSER                                       */}
      {/* ============================================================ */}
      <div>
        <Card title={editingId ? 'Edit Notification' : 'Send Notification'}>

          {editingId && (
            <div style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(var(--bs-accent-rgb), 0.08)',
              border: '1px solid rgba(var(--bs-accent-rgb), 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              <div style={{ fontSize: 12, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: T.accent,
                }} />
                Editing existing notification
              </div>
              <button
                onClick={cancelEdit}
                style={{
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  color: T.textSecondary,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* ——— BASICS ——— */}
          <div style={sectionLabel}>Basics</div>

          {/* `1fr` is `minmax(auto, 1fr)`, and a <select>'s auto minimum is its
              widest option, so this did not merely crowd at 360 — it pushed the
              grid wider than the card. Exactly two children, so auto-fit tops
              out at two tracks and collapses to one below ~452px. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12, marginBottom: 12 }}>
            <FieldLabel label="Type">
              <select
                className="bs-notif-input"
                style={IS}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                <option value="toast">Toast (small popup)</option>
                <option value="modal">Modal (blocking)</option>
                {/* Was "Banner (top scrolling)". The banner has never
                    scrolled — components/AppShell.tsx renders it as a static
                    bar — so this option described a behaviour the product does
                    not have, and admins were composing against it. */}
                <option value="banner">Banner (top bar)</option>
              </select>
            </FieldLabel>

            <FieldLabel label="Audience">
              <select
                className="bs-notif-input"
                style={IS}
                value={form.audience || "all"}
                onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
              >
                <option value="all">All users</option>
                <option value="users">Users only</option>
                <option value="admins">Admins only</option>
              </select>
            </FieldLabel>
          </div>

          <div style={{ marginBottom: 14 }}>
            <FieldLabel label="Title (optional)">
              <input
                className="bs-notif-input"
                style={IS}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. New partner added"
              />
            </FieldLabel>
          </div>

          <div style={{ marginBottom: 8 }}>
            <FieldLabel label="Message">
              <textarea
                className="bs-notif-input"
                style={{
                  ...IS,
                  height: 96,
                  padding: '10px 12px',
                  resize: 'vertical',
                  lineHeight: 1.6,
                  fontFamily: 'Inter, sans-serif',
                }}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder={form.steps?.length ? 'Ignored — steps will be shown instead' : 'What users will see'}
                disabled={form.steps?.length > 0}
              />
            </FieldLabel>
            {form.steps?.length > 0 && (
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 6 }}>
                Steps take precedence over message.
              </div>
            )}
          </div>

          {/* ——— STEPS ——— */}
          <div style={{ height: 1, background: T.border, margin: '20px 0 16px' }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{ ...sectionLabel, marginBottom: 0 }}>
              Steps {form.steps?.length ? `· ${form.steps.length}` : '(optional)'}
            </div>
          </div>

          {form.steps?.map((step: any, i: number) => (
            <div key={i} style={stepPanelStyle}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.textSecondary,
                }}>
                  <span style={{
                    width: 20,
                    height: 20,
                    borderRadius: 999,
                    background: 'rgba(var(--bs-accent-rgb), 0.15)',
                    color: T.accent,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--bs-text-2xs)',
                    fontWeight: 700,
                  }}>{i + 1}</span>
                  Step {i + 1}
                </div>

                <button
                  className="bs-notif-step-remove"
                  onClick={() => removeStep(i)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.border}`,
                    color: T.textMuted,
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '4px 10px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Remove
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  className="bs-notif-input"
                  placeholder="Title"
                  value={step.title}
                  onChange={e => updateStep(i, 'title', e.target.value)}
                  style={IS}
                />
                <input
                  className="bs-notif-input"
                  placeholder="Message"
                  value={step.message}
                  onChange={e => updateStep(i, 'message', e.target.value)}
                  style={IS}
                />
                <input
                  className="bs-notif-input"
                  placeholder="Image URL (optional)"
                  value={step.image_url}
                  onChange={e => updateStep(i, 'image_url', e.target.value)}
                  style={IS}
                />
              </div>
            </div>
          ))}

          <button
            className="bs-notif-add-step"
            onClick={addStep}
            style={{
              width: '100%',
              height: 40,
              background: 'transparent',
              border: `1px dashed ${T.border}`,
              borderRadius: 10,
              color: T.textSecondary,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginTop: form.steps?.length ? 4 : 0,
            }}
          >
            + Add Step
          </button>

          {/* ——— MEDIA ——— */}
          <div style={{ height: 1, background: T.border, margin: '24px 0 16px' }} />

          <div style={sectionLabel}>Media</div>

          <div style={{ marginBottom: 12 }}>
            <FieldLabel label="Image URL (optional)">
              <input
                className="bs-notif-input"
                style={IS}
                value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </FieldLabel>
          </div>

          <div style={{ marginBottom: 4 }}>
            <FieldLabel label="Image Position">
              <div style={{
                display: 'flex',
                gap: 4,
                background: T.elevated,
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                padding: 4,
              }}>
                {['top', 'left', 'right'].map(pos => {
                  const active = form.image_position === pos
                  return (
                    <button
                      key={pos}
                      onClick={() => setForm(f => ({ ...f, image_position: pos }))}
                      style={{
                        flex: 1,
                        height: 32,
                        borderRadius: 999,
                        border: 'none',
                        background: active ? T.accentFill : 'transparent',
                        color: active ? '#fff' : T.text,
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {pos}
                    </button>
                  )
                })}
              </div>
            </FieldLabel>
          </div>

          {/* ——— SCHEDULING ——— */}
          <div style={{ height: 1, background: T.border, margin: '24px 0 16px' }} />

          <div style={sectionLabel}>Scheduling</div>

          {/* Same fix. A datetime-local input carries the widest intrinsic
              minimum of any control on this tab, so this row overflowed first. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12, marginBottom: 4 }}>
            <FieldLabel label="Schedule (optional)">
              <input
                className="bs-notif-input"
                type="datetime-local"
                style={{ ...IS, colorScheme: 'dark' }}
                value={form.scheduled_for}
                onChange={e => setForm(f => ({ ...f, scheduled_for: e.target.value }))}
              />
            </FieldLabel>

            <FieldLabel label="Expiry (optional)">
              <input
                className="bs-notif-input"
                type="datetime-local"
                style={{ ...IS, colorScheme: 'dark' }}
                value={form.expires_at || ""}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </FieldLabel>
          </div>

          {/* ——— SEND ——— */}
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            {editingId && (
              <button
                onClick={cancelEdit}
                disabled={sending}
                style={{
                  flex: '0 0 auto',
                  height: 44,
                  padding: '0 22px',
                  background: 'transparent',
                  color: T.textSecondary,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  fontSize: 'var(--bs-text-sm)',
                  fontWeight: 600,
                  cursor: sending ? 'not-allowed' : 'pointer',
                  opacity: sending ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={send}
              disabled={sending}
              style={{
                flex: 1,
                height: 44,
                background: T.accentFill,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 'var(--bs-text-sm)',
                fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer',
                opacity: sending ? 0.6 : 1,
                transition: 'opacity 0.15s',
                letterSpacing: '0.01em',
              }}
            >
              {sending
                ? (editingId ? 'Saving…' : 'Sending…')
                : (editingId ? 'Save Changes' : 'Send Notification')}
            </button>
          </div>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN — PREVIEW + HISTORY                             */}
      {/* ============================================================ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Live preview */}
        <Card title="Live Preview">
          <div style={sectionLabel}>How it will appear</div>

          <div style={{
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 'var(--bs-radius-lg)',
            padding: 20,
            minHeight: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {form.type === 'toast' && (
              <div style={{
                width: '100%',
                maxWidth: 320,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 'var(--bs-radius-lg)',
                padding: '12px 14px',
                boxShadow: 'var(--bs-elev-2)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: T.accent,
                  marginTop: 6,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {form.title && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>
                      {form.title}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
                    {form.message || 'Toast preview…'}
                  </div>
                </div>
              </div>
            )}

            {form.type === 'modal' && (
              <div style={{
                width: '100%',
                maxWidth: 340,
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 'var(--bs-radius-lg)',
                padding: 20,
                boxShadow: 'var(--bs-elev-3)',
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                  {form.title || 'Modal Title'}
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>
                  {form.message || 'Modal message…'}
                </div>
                <div style={{
                  height: 32,
                  background: T.accentFill,
                  borderRadius: 'var(--bs-radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#fff',
                }}>
                  Got it
                </div>
              </div>
            )}

            {/* This preview ran a 12s infinite marquee — the only live one left
                in the app — while components/AppShell.tsx rendered the banner
                as a static bar. The composer was showing admins a behaviour the
                product does not have, so the preview, not the product, was
                wrong. It now mirrors AppShell exactly: wraps, clamps at three
                lines, dismiss control on the right.

                The marquee is gone rather than given a pause control because
                WCAG 2.2.2 (Pause, Stop, Hide) would require one for content
                that moves automatically past five seconds, and that is more
                chrome than a slim announcement bar can carry. Phase 13 set the
                same precedent on the ShopAds carousel. */}
            {form.type === 'banner' && (
              <div style={{
                width: '100%',
                minHeight: 'var(--bs-control-md)',
                background: `rgba(var(--bs-accent-rgb), 0.12)`,
                border: `1px solid rgba(var(--bs-accent-rgb), 0.25)`,
                borderRadius: 'var(--bs-radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--bs-space-2)',
                padding: 'var(--bs-space-1) var(--bs-space-2) var(--bs-space-1) var(--bs-space-3)',
                fontSize: 12,
                color: T.text,
                fontWeight: 500,
              }}>
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: 'center',
                  lineHeight: 'var(--bs-leading-snug)',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 3,
                  overflow: 'hidden',
                  overflowWrap: 'anywhere',
                }}>
                  {form.message || 'Banner message will appear here'}
                </span>
                <span aria-hidden="true" style={{ flexShrink: 0, alignSelf: 'flex-start', color: T.textMuted, display: 'flex', alignItems: 'center', height: 'var(--bs-control-sm)' }}>
                  <XIcon />
                </span>
              </div>
            )}
          </div>

          {(form.audience && form.audience !== 'all') || form.scheduled_for || form.expires_at ? (
            <div style={{
              marginTop: 12,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
            }}>
              {form.audience && form.audience !== 'all' && (
                <span style={{
                  fontSize: 'var(--bs-text-2xs)',
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: T.elevated,
                  border: `1px solid ${T.border}`,
                  color: T.textSecondary,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {form.audience}
                </span>
              )}
              {form.scheduled_for && (
                <span style={{
                  fontSize: 'var(--bs-text-2xs)',
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: `rgba(var(--bs-accent-rgb), 0.1)`,
                  border: `1px solid rgba(var(--bs-accent-rgb), 0.22)`,
                  color: T.accent,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Scheduled
                </span>
              )}
              {form.expires_at && (
                <span style={{
                  fontSize: 'var(--bs-text-2xs)',
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: `rgba(var(--bs-warning-rgb), 0.1)`,
                  border: `1px solid rgba(var(--bs-warning-rgb), 0.22)`,
                  color: T.warning,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  Expires
                </span>
              )}
            </div>
          ) : null}
        </Card>

        {/* History */}
        <Card title="History">
          {list.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              fontSize: 13,
              color: T.textMuted,
            }}>
              No notifications yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {list.map((n, idx) => (
                <div
                  key={n.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: idx === list.length - 1 ? 'none' : `1px solid ${T.border}`,
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 6,
                      flexWrap: 'wrap',
                    }}>
                      <span style={typeBadgeStyle(n.type)}>
                        {n.type}
                      </span>
                      <span style={statusPillStyle(!!n.active)}>
                        <span style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: n.active ? T.success : T.textMuted,
                        }} />
                        {n.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {n.title && (
                      <div style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: T.text,
                        marginBottom: 2,
                        lineHeight: 1.4,
                      }}>
                        {n.title}
                      </div>
                    )}

                    <div style={{
                      fontSize: 13,
                      color: T.textSecondary,
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {n.message || (n.steps?.length ? `${n.steps.length} step${n.steps.length > 1 ? 's' : ''}` : '—')}
                    </div>

                    <div style={{
                      fontSize: 11,
                      color: T.textMuted,
                      marginTop: 6,
                    }}>
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div style={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    alignItems: 'stretch',
                  }}>
                    <button
                      onClick={() => startEdit(n)}
                      disabled={editingId === n.id}
                      style={{
                        height: 'var(--bs-control-sm)',
                        padding: '0 12px',
                        background: editingId === n.id
                          ? 'rgba(var(--bs-accent-rgb), 0.15)'
                          : 'transparent',
                        border: editingId === n.id
                          ? '1px solid rgba(var(--bs-accent-rgb), 0.35)'
                          : `1px solid ${T.border}`,
                        borderRadius: 999,
                        color: editingId === n.id ? T.accent : T.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: editingId === n.id ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {editingId === n.id ? 'Editing…' : 'Edit'}
                    </button>
                    <button
                      onClick={() => toggle(n.id, !n.active)}
                      style={{
                        height: 'var(--bs-control-sm)',
                        padding: '0 12px',
                        background: 'transparent',
                        border: `1px solid ${T.border}`,
                        borderRadius: 999,
                        color: n.active ? T.warning : T.success,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {n.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
