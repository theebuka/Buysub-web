'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { toast } from "sonner"
import { useTheme as useThemeController } from '@/lib/theme'
import { getAccessToken } from '@/lib/session'
import { API_BASE } from '@/lib/config'

import { BtnLabel, ClipboardIcon, CloakIcon, DownloadIcon, EmptyState, EyeOffIcon, Loading, LockIcon, Pagination, PaginationBar, PhoneIcon, QrIcon, SearchIcon, T, WarningIcon, XIcon, apiFetch, emptyPagination, inputStyle, parsePagination } from '../_lib/shared'

export type LinkRow = {
  id: string
  slug: string
  destination_url: string
  active: boolean
  click_count: number
  click_limit: number | null
  expires_at: string | null
  tags: string | null
  has_password?: boolean
  cloak?: boolean
  hide_referrer?: boolean
  deep_link_ios?: string | null
  deep_link_android?: string | null
  ios_app_store_id?: string | null
  android_package?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  qr_config?: { fg?: string; bg?: string; logo_url?: string; ecc?: 'L'|'M'|'Q'|'H' } | null
  created_at?: string
  updated_at?: string
}

export type LinkRule = {
  id?: string
  link_id?: string
  priority: number
  match_type: 'country' | 'region' | 'city' | 'os'
  match_value: string
  destination_url: string
}

export type LinkFormState = Partial<LinkRow> & {
  password?: string        // plain text on write; never received back
  clearPassword?: boolean  // explicit flag to null out server-side
  rules: LinkRule[]
}

export const EMPTY_LINK_FORM = (): LinkFormState => ({
  slug: '',
  destination_url: '',
  tags: '',
  active: true,
  click_limit: null,
  expires_at: null,
  cloak: false,
  hide_referrer: false,
  deep_link_ios: '',
  deep_link_android: '',
  ios_app_store_id: '',
  android_package: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  qr_config: { fg: '#000000', bg: '#ffffff', ecc: 'M' },
  rules: [],
})

export const SHORT_BASE = 'https://go.buysub.ng'

export function toDtLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function fromDtLocal(v: string): string | null {
  if (!v) return null
  return new Date(v).toISOString()
}

// ════════════════════════════════════════════════════════════════════
// MAIN TAB
// ════════════════════════════════════════════════════════════════════
export function LinksTab() {
  const [links, setLinks] = useState<LinkRow[]>([])
  const [pagination, setPagination] = useState<Pagination>(emptyPagination)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const searchTimer = useRef<any>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LinkFormState>(EMPTY_LINK_FORM())
  const [panelOpen, setPanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [qrFor, setQrFor] = useState<LinkRow | null>(null)

  const load = useCallback(async (page = 1, q = search) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (q) params.set('q', q)
    const r = await apiFetch(`/v2/admin/links?${params}`)
    if (r.ok) {
      setLinks(r.data || [])
      setPagination(parsePagination(r))
    }
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [])

  const onSearch = (q: string) => {
    setSearch(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => load(1, q), 400)
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_LINK_FORM())
    setPanelOpen(true)
  }

  const openEdit = async (l: LinkRow) => {
    setEditingId(l.id)
    setPanelOpen(true)
    // Fetch full detail (with rules)
    const r = await apiFetch(`/v2/admin/links/${l.id}`)
    const src: any = r.ok ? r.data : l
    setForm({
      ...EMPTY_LINK_FORM(),
      ...src,
      password: '',
      clearPassword: false,
      rules: Array.isArray(src.rules) ? src.rules : [],
      qr_config: src.qr_config || { fg: '#000000', bg: '#ffffff', ecc: 'M' },
    })
  }

  const closePanel = () => {
    setPanelOpen(false)
    setEditingId(null)
    setForm(EMPTY_LINK_FORM())
  }

  const saveLink = async () => {
    if (!form.destination_url) {
      toast.error('Destination URL is required')
      return
    }
    setSaving(true)

    const payload: any = {
      destination_url: form.destination_url,
      slug: form.slug || undefined,
      tags: form.tags || null,
      active: form.active,
      expires_at: form.expires_at || null,
      click_limit: form.click_limit || null,
      cloak: !!form.cloak,
      hide_referrer: !!form.hide_referrer,
      deep_link_ios: form.deep_link_ios || null,
      deep_link_android: form.deep_link_android || null,
      ios_app_store_id: form.ios_app_store_id || null,
      android_package: form.android_package || null,
      utm_source: form.utm_source || null,
      utm_medium: form.utm_medium || null,
      utm_campaign: form.utm_campaign || null,
      utm_content: form.utm_content || null,
      utm_term: form.utm_term || null,
      qr_config: form.qr_config || null,
    }

    // Password: only send if user actually entered a non-trivial value.
    // The ' ' sentinel (used to flip the "change password" UI into input mode)
    // must be ignored; only a real, non-empty password should be submitted.
    const pwTrimmed = (form.password || '').trim()
    if (pwTrimmed) payload.password = pwTrimmed
    else if (form.clearPassword) payload.password = null

    const url = editingId ? `/v2/admin/links/${editingId}` : '/v2/admin/links'
    const method = editingId ? 'PATCH' : 'POST'
    const r = await apiFetch(url, { method, body: JSON.stringify(payload) })

    if (!r.ok) {
      toast.error(r.error || 'Failed to save link')
      setSaving(false)
      return
    }

    const savedId = editingId || r.data?.id
    // Rule sync: delete removed rules, upsert current ones
    if (savedId) {
      const { data: existing } = await apiFetch(`/v2/admin/links/${savedId}/rules`)
      const existingIds = new Set((existing || []).map((r: any) => r.id))
      const keepIds = new Set(form.rules.filter(r => r.id).map(r => r.id!))
      // Delete removed
      for (const id of existingIds) {
        if (!keepIds.has(id as string)) {
          await apiFetch(`/v2/admin/links/${savedId}/rules/${id}`, { method: 'DELETE' })
        }
      }
      // Upsert
      for (const rule of form.rules) {
        if (rule.id) {
          await apiFetch(`/v2/admin/links/${savedId}/rules/${rule.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              priority: rule.priority,
              match_type: rule.match_type,
              match_value: rule.match_value,
              destination_url: rule.destination_url,
            }),
          })
        } else {
          await apiFetch(`/v2/admin/links/${savedId}/rules`, {
            method: 'POST',
            body: JSON.stringify(rule),
          })
        }
      }
    }

    toast.success(editingId ? 'Link updated' : 'Link created')
    closePanel()
    await load(pagination.page)
    setSaving(false)
  }

  const toggleActive = async (l: LinkRow) => {
    const r = await apiFetch(`/v2/admin/links/${l.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: !l.active }),
    })
    if (r.ok) {
      setLinks(prev => prev.map(x => x.id === l.id ? { ...x, active: !l.active } : x))
    } else {
      toast.error(r.error || 'Failed')
    }
  }

  const deleteLink = async (id: string) => {
    if (!confirm('Delete this link? This cannot be undone.')) return
    await apiFetch(`/v2/admin/links/${id}`, { method: 'DELETE' })
    toast.success('Link deleted')
    await load(pagination.page)
  }

  const copyShort = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(`${SHORT_BASE}/${slug}`)
      toast.success('Short link copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  const IS = inputStyle()

  return (
    <div>
      <style>{`
        .bs-lnk-input:focus, .bs-lnk-input:focus-visible {
          outline: none !important; border-color: var(--bs-accent) !important;
        }
        .bs-lnk-card { transition: border-color .18s, transform .18s; }
        .bs-lnk-card:hover { border-color: var(--bs-border-strong) !important; transform: translateY(-1px); }
        .bs-lnk-new-btn:hover { background: var(--bs-accent-hover) !important; }
        .bs-lnk-ghost:hover:not(:disabled) { background: var(--bs-bg-muted) !important; }
        .bs-lnk-ghost-danger:hover:not(:disabled) {
          background: rgba(var(--bs-error-rgb), .08) !important;
          border-color: rgba(var(--bs-error-rgb), .35) !important;
          color: var(--bs-error) !important;
        }
        .bs-lnk-ghost-accent:hover:not(:disabled) {
          background: rgba(var(--bs-accent-rgb), .1) !important;
          border-color: rgba(var(--bs-accent-rgb), .4) !important;
          color: var(--bs-accent-on-surface) !important;
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={{
        display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 10,
        marginBottom: 18,
      }}>
        <div style={{ fontSize: 'var(--bs-text-xl)', fontWeight: 700, color: T.text, lineHeight: 1 }}>
          Short links
        </div>
        <div style={{ fontSize: 12, color: T.textMuted }}>
          {pagination.total || links.length} total · go.buysub.ng
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={openCreate}
          className="bs-lnk-new-btn"
          style={{
            height: 'var(--bs-control-md)', padding: '0 20px', borderRadius: 10,
            background: T.accentFill, border: 'none', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 14px rgba(124,92,255,0.25)',
            transition: 'background .15s',
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
          New link
        </button>
      </div>

      {/* ─── SEARCH ─── */}
      <div style={{ position: 'relative', maxWidth: 380, marginBottom: 20 }}>
        <input
          className="bs-lnk-input"
          placeholder="Search slug, destination, or tag…"
          value={search}
          onChange={e => onSearch(e.target.value)}
          style={{ ...IS, paddingLeft: 36, width: '100%' }}
        />
        <div style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: T.textMuted, fontSize: 'var(--bs-text-sm)', pointerEvents: 'none',
        }}><SearchIcon /></div>
      </div>

      {/* ─── LIST ─── */}
      {loading ? (
        <Loading />
      ) : links.length === 0 ? (
        <EmptyState text="No links yet — create your first one" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {links.map(l => (
            <LinkRowCard
              key={l.id}
             
              link={l}
              onEdit={() => openEdit(l)}
              onToggle={() => toggleActive(l)}
              onDelete={() => deleteLink(l.id)}
              onCopy={() => copyShort(l.slug)}
              onQR={() => setQrFor(l)}
            />
          ))}
        </div>
      )}

      {pagination?.pages > 1 && (
        <div style={{ marginTop: 20 }}>
          <PaginationBar pagination={pagination} onPage={p => load(p)} />
        </div>
      )}

      {/* ─── EDITOR DRAWER ─── */}
      {panelOpen && (
        <LinkEditorDrawer
         
          form={form}
          setForm={setForm}
          onSave={saveLink}
          onCancel={closePanel}
          saving={saving}
          isEdit={!!editingId}
        />
      )}

      {/* ─── QR DIALOG ─── */}
      {qrFor && (
        <QrDialog
         
          link={qrFor}
          onClose={() => setQrFor(null)}
          onSaveConfig={async (cfg) => {
            await apiFetch(`/v2/admin/links/${qrFor.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ qr_config: cfg }),
            })
            toast.success('QR config saved')
            await load(pagination.page)
          }}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// LIST ROW
// ════════════════════════════════════════════════════════════════════
export function LinkRowCard({
  link, onEdit, onToggle, onDelete, onCopy, onQR,
}: {
  link: LinkRow
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
  onCopy: () => void
  onQR: () => void
}) {
  const features: { label: string; icon: React.ReactNode }[] = []
  if (link.has_password)  features.push({ label: 'Password', icon: <LockIcon/> })
  if (link.cloak)         features.push({ label: 'Cloaked',  icon: <CloakIcon/> })
  if (link.hide_referrer) features.push({ label: 'No ref',   icon: <EyeOffIcon/> })
  if (link.deep_link_ios || link.deep_link_android)
                          features.push({ label: 'Deep link', icon: <PhoneIcon/> })

  const expMs = link.expires_at ? new Date(link.expires_at).getTime() - Date.now() : null
  const limitReached = link.click_limit != null && link.click_count >= link.click_limit
  const isExpired = expMs != null && expMs < 0

  return (
    <div
      className="bs-lnk-card"
      style={{
        background: T.card,
        // Second Marketplace leak, same shape as the product card in Phase 7:
        // #1C1C1F sits close to --bs-border-default in dark so the healthy
        // state looked right there, and drew a near-black border on a white
        // card in light. The healthy-vs-degraded distinction is preserved.
        border: `1px solid ${link.active && !isExpired && !limitReached ? T.borderSubtle : T.border}`,
        borderRadius: 'var(--bs-radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        flexWrap: 'wrap',
        opacity: link.active && !isExpired && !limitReached ? 1 : 0.6,
      }}
    >
      {/* Identity */}
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 13, fontWeight: 600, color: T.accent,
            fontFamily: "'SF Mono', Menlo, monospace",
          }}>
            /{link.slug}
          </span>
          <span style={{
            fontSize: 11, color: T.textMuted,
            fontFamily: "'SF Mono', Menlo, monospace",
          }}>
            go.buysub.ng
          </span>
          {features.map(f => (
            <span key={f.label} title={f.label} style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--bs-space-1)',
              height: 20, padding: '0 var(--bs-space-2)', borderRadius: 'var(--bs-radius-full)',
              background: 'rgba(var(--bs-accent-rgb), .1)',
              border: '1px solid rgba(var(--bs-accent-rgb), .25)',
              // Fifth instance of the on-tint bug: the label was plain
              // T.accent on a 10% tint of itself. Was also 10px, under the
              // 11 floor.
              color: 'color-mix(in srgb, var(--bs-accent), var(--bs-on-tint-mix))',
              fontSize: 'var(--bs-text-2xs)', fontWeight: 600,
            }}>
              {f.icon}
              {f.label}
            </span>
          ))}
        </div>
        <div style={{
          fontSize: 12, color: T.textMuted, marginTop: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          → {link.destination_url}
        </div>
        <div style={{ fontSize: 11, color: T.textFaint, marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>{link.click_count || 0} click{link.click_count === 1 ? '' : 's'}
            {link.click_limit ? ` / ${link.click_limit}` : ''}
          </span>
          {link.expires_at && (
            <span style={{ color: isExpired ? T.warning : T.textFaint }}>
              {isExpired ? 'Expired' : `Expires ${new Date(link.expires_at).toLocaleDateString()}`}
            </span>
          )}
          {link.tags && <span>· {link.tags}</span>}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <IconBtn onClick={onCopy} title="Copy short URL">{<ClipboardIcon/>}</IconBtn>
        <IconBtn onClick={onQR} title="Show QR code"><QrIcon /></IconBtn>
        <GhostBtn onClick={onEdit} variant="accent">Edit</GhostBtn>
        <GhostBtn onClick={onToggle}>
          {link.active ? 'Pause' : 'Resume'}
        </GhostBtn>
        <GhostBtn onClick={onDelete} variant="danger">Delete</GhostBtn>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// EDITOR DRAWER — Tabbed sections
// ════════════════════════════════════════════════════════════════════
export type EditorTab = 'basics' | 'targeting' | 'security' | 'deeplinks' | 'utm' | 'qr'

export function LinkEditorDrawer({
  form, setForm, onSave, onCancel, saving, isEdit,
}: {
  form: LinkFormState
  setForm: React.Dispatch<React.SetStateAction<LinkFormState>>
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isEdit: boolean
}) {
  const [tab, setTab] = useState<EditorTab>('basics')
  const IS = inputStyle()

  const tabs: { id: EditorTab; label: string; hint: string }[] = [
    { id: 'basics',    label: 'Basics',     hint: 'URL, slug, expiry' },
    { id: 'targeting', label: 'Targeting',  hint: 'Geo & OS rules' },
    { id: 'security',  label: 'Security',   hint: 'Password, cloak, referrer' },
    { id: 'deeplinks', label: 'Deep links', hint: 'iOS & Android' },
    { id: 'utm',       label: 'UTM',        hint: 'Campaign tracking' },
    { id: 'qr',        label: 'QR code',    hint: 'Preview & download' },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          zIndex: 150, animation: 'bsFadeIn .2s ease',
        }}
      />
      <style>{`@keyframes bsFadeIn { from{opacity:0} to{opacity:1} } @keyframes bsSlideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }`}</style>

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(560px, 100vw)',
        background: T.card,
        borderLeft: `1px solid ${T.border}`,
        zIndex: 200,
        display: 'flex', flexDirection: 'column',
        animation: 'bsSlideIn .25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 14px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--bs-text-lg)', fontWeight: 700, color: T.text }}>
              {isEdit ? 'Edit link' : 'New short link'}
            </div>
            {form.slug && (
              <div style={{
                fontSize: 11, color: T.textMuted, marginTop: 2,
                fontFamily: "'SF Mono', Menlo, monospace",
              }}>
                {SHORT_BASE}/{form.slug}
              </div>
            )}
          </div>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: 'var(--bs-radius-md)',
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.textSecondary, cursor: 'pointer', fontSize: 'var(--bs-text-lg)',
            }}
          ><XIcon /></button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 4,
          padding: '12px 24px 0',
          borderBottom: `1px solid ${T.border}`,
          overflowX: 'auto',
        }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 14px',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${tab === t.id ? T.accent : 'transparent'}`,
                color: tab === t.id ? T.text : T.textMuted,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                marginBottom: -1, whiteSpace: 'nowrap',
                transition: 'color .15s, border-color .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {tab === 'basics'    && <BasicsSection form={form} setForm={setForm} IS={IS} />}
          {tab === 'targeting' && <TargetingSection form={form} setForm={setForm} IS={IS} />}
          {tab === 'security'  && <SecuritySection form={form} setForm={setForm} IS={IS} isEdit={isEdit} />}
          {tab === 'deeplinks' && <DeepLinksSection form={form} setForm={setForm} IS={IS} />}
          {tab === 'utm'       && <UtmSection form={form} setForm={setForm} IS={IS} />}
          {tab === 'qr'        && <QrSection form={form} setForm={setForm} IS={IS} />}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: '0 22px', height: 44, borderRadius: 10,
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.textSecondary,
              fontSize: 'var(--bs-text-sm)', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="bs-lnk-new-btn"
            style={{
              flex: 1, height: 44, borderRadius: 10,
              background: T.accentFill, border: 'none', color: '#fff',
              fontSize: 'var(--bs-text-sm)', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Create link')}
          </button>
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
// EDITOR SECTIONS (module-level to preserve focus)
// ════════════════════════════════════════════════════════════════════

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 'var(--bs-text-2xs)', color: T.textMuted, textTransform: 'uppercase',
      letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10,
    }}>{children}</div>
  )
}

export function FieldStack({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
}

export function FieldRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12, color: T.text, fontWeight: 500 }}>{children}</div>
      {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{hint}</div>}
    </div>
  )
}

export function ToggleRow({
  label, hint, value, onChange,
}: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: T.elevated,
        border: `1px solid ${T.border}`,
        borderRadius: 'var(--bs-radius-lg)',
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{
        width: 38, height: 22, borderRadius: 999,
        background: value ? T.accent : T.border,
        position: 'relative', transition: 'background .15s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2, left: value ? 18 : 2,
          width: 18, height: 18, borderRadius: 999,
          background: '#fff', transition: 'left .15s',
        }} />
      </div>
    </div>
  )
}

// ── BASICS ──────────────────────────────────────────────────────────
export function BasicsSection({ form, setForm, IS }: any) {
  return (
    <FieldStack>
      <SectionLabel>Destination</SectionLabel>
      <div>
        <Label hint="The full URL visitors will land on.">Destination URL *</Label>
        <input
          className="bs-lnk-input"
          value={form.destination_url || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, destination_url: e.target.value }))}
          placeholder="https://example.com/landing"
          style={IS}
        />
      </div>

      <div>
        <Label hint="Leave blank to auto-generate. Lowercase letters, numbers, and dashes only.">
          Custom slug
        </Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{
            height: 'var(--bs-control-md)', padding: '0 12px', display: 'flex', alignItems: 'center',
            background: T.elevated, border: `1px solid ${T.border}`,
            borderRight: 'none', borderRadius: '10px 0 0 10px',
            fontSize: 13, color: T.textMuted,
            fontFamily: "'SF Mono', Menlo, monospace",
          }}>
            go.buysub.ng/
          </div>
          <input
            className="bs-lnk-input"
            value={form.slug || ''}
            onChange={(e: any) => setForm((f: any) => ({
              ...f,
              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
            }))}
            placeholder="my-link"
            style={{ ...IS, borderRadius: '0 10px 10px 0', flex: 1 }}
          />
        </div>
      </div>

      <div>
        <Label>Tags</Label>
        <input
          className="bs-lnk-input"
          value={form.tags || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, tags: e.target.value }))}
          placeholder="campaign, winter-2026"
          style={IS}
        />
      </div>

      <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
      <SectionLabel>Expiration</SectionLabel>

      <FieldRow>
        <div>
          <Label hint="Link stops working after this date.">Expires at</Label>
          <input
            className="bs-lnk-input"
            type="datetime-local"
            value={toDtLocal(form.expires_at)}
            onChange={(e: any) => setForm((f: any) => ({ ...f, expires_at: fromDtLocal(e.target.value) }))}
            style={{ ...IS, colorScheme: 'dark' }}
          />
        </div>
        <div>
          <Label hint="Stop after N clicks. Blank = no limit.">Click limit</Label>
          <input
            className="bs-lnk-input"
            type="number"
            min={0}
            value={form.click_limit ?? ''}
            onChange={(e: any) => setForm((f: any) => ({
              ...f,
              click_limit: e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10)),
            }))}
            placeholder="e.g. 100"
            style={IS}
          />
        </div>
      </FieldRow>
    </FieldStack>
  )
}

// ── TARGETING ───────────────────────────────────────────────────────
export function TargetingSection({ form, setForm, IS }: any) {
  const addRule = () => {
    setForm((f: any) => ({
      ...f,
      rules: [
        ...f.rules,
        {
          priority: (f.rules[f.rules.length - 1]?.priority ?? 50) + 10,
          match_type: 'country',
          match_value: '',
          destination_url: '',
        },
      ],
    }))
  }
  const updateRule = (idx: number, patch: Partial<LinkRule>) => {
    setForm((f: any) => ({
      ...f,
      rules: f.rules.map((r: LinkRule, i: number) => i === idx ? { ...r, ...patch } : r),
    }))
  }
  const removeRule = (idx: number) => {
    setForm((f: any) => ({ ...f, rules: f.rules.filter((_: any, i: number) => i !== idx) }))
  }

  return (
    <FieldStack>
      <SectionLabel>Targeting rules</SectionLabel>
      <div style={{
        padding: 12, borderRadius: 10,
        background: `rgba(var(--bs-accent-rgb), 0.06)`,
        border: `1px solid rgba(var(--bs-accent-rgb), 0.2)`,
        fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
      }}>
        Rules are evaluated in <strong>priority order (lowest first)</strong>.
        The first rule that matches the visitor's country, region, city, or OS wins.
        If no rule matches, the visitor falls through to the main <strong>Destination URL</strong>.
      </div>

      {form.rules.length === 0 ? (
        <div style={{
          padding: 20, textAlign: 'center', fontSize: 13,
          color: T.textMuted,
          background: T.elevated, border: `1px dashed ${T.border}`, borderRadius: 'var(--bs-radius-lg)',
        }}>
          No rules yet. All visitors go to the default destination.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {form.rules.map((rule: LinkRule, idx: number) => (
            <div key={rule.id || idx} style={{
              padding: 14, borderRadius: 'var(--bs-radius-lg)',
              background: T.elevated, border: `1px solid ${T.border}`,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 999,
                  background: 'rgba(var(--bs-accent-rgb), .15)',
                  color: T.accent, fontSize: 11, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>{idx + 1}</span>
                <span style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500 }}>
                  Rule {idx + 1}
                </span>
                <div style={{ flex: 1 }} />
                <input
                  className="bs-lnk-input"
                  type="number"
                  value={rule.priority}
                  onChange={(e: any) => updateRule(idx, { priority: parseInt(e.target.value, 10) || 0 })}
                  title="Priority (lower = evaluated first)"
                  style={{ ...IS, width: 70, height: 'var(--bs-control-sm)', fontSize: 12, padding: '0 8px' }}
                />
                <button
                  onClick={() => removeRule(idx)}
                  className="bs-lnk-ghost-danger"
                  style={{
                    height: 'var(--bs-control-sm)', padding: '0 10px', borderRadius: 999,
                    background: 'transparent', border: `1px solid ${T.border}`,
                    color: T.textMuted, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >Remove</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 8 }}>
                <select
                  className="bs-lnk-input"
                  value={rule.match_type}
                  onChange={(e: any) => updateRule(idx, { match_type: e.target.value as any })}
                  style={IS}
                >
                  <option value="country">If country is…</option>
                  <option value="region">If region is…</option>
                  <option value="city">If city is…</option>
                  <option value="os">If OS is…</option>
                </select>
                {rule.match_type === 'os' ? (
                  <select
                    className="bs-lnk-input"
                    value={rule.match_value}
                    onChange={(e: any) => updateRule(idx, { match_value: e.target.value })}
                    style={IS}
                  >
                    <option value="">Select OS…</option>
                    <option value="ios">iOS</option>
                    <option value="android">Android</option>
                    <option value="desktop">Desktop</option>
                  </select>
                ) : (
                  <input
                    className="bs-lnk-input"
                    value={rule.match_value}
                    onChange={(e: any) => updateRule(idx, { match_value: e.target.value })}
                    placeholder={
                      rule.match_type === 'country' ? 'e.g. NG (ISO-2)' :
                      rule.match_type === 'region'  ? 'e.g. Lagos'      :
                      'e.g. Ikeja'
                    }
                    style={IS}
                  />
                )}
              </div>

              <input
                className="bs-lnk-input"
                value={rule.destination_url}
                onChange={(e: any) => updateRule(idx, { destination_url: e.target.value })}
                placeholder="Destination URL for matching visitors"
                style={IS}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={addRule}
        style={{
          width: '100%', height: 40,
          background: 'transparent', border: `1px dashed ${T.border}`,
          borderRadius: 10, color: T.textSecondary, fontSize: 13, fontWeight: 500,
          cursor: 'pointer',
        }}
      >+ Add rule</button>
    </FieldStack>
  )
}

// ── SECURITY ────────────────────────────────────────────────────────
export function SecuritySection({ form, setForm, IS, isEdit }: any) {
  const alreadyHasPassword = isEdit && (form as any).has_password && !form.clearPassword
  return (
    <FieldStack>
      <SectionLabel>Access control</SectionLabel>

      <div>
        <Label hint="Visitors must enter this password before being redirected.">
          Password protection
        </Label>
        {alreadyHasPassword && !form.password ? (
          <div style={{
            padding: 12, borderRadius: 10,
            background: T.elevated, border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div style={{ fontSize: 13, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <LockIcon/> Password is set
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setForm((f: any) => ({ ...f, password: ' ' }))}
                style={{
                  height: 'var(--bs-control-sm)', padding: '0 12px', borderRadius: 999,
                  background: 'transparent', border: `1px solid ${T.border}`,
                  color: T.text, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >Change</button>
              <button
                onClick={() => setForm((f: any) => ({ ...f, clearPassword: true, password: '' }))}
                style={{
                  height: 'var(--bs-control-sm)', padding: '0 12px', borderRadius: 999,
                  background: 'transparent', border: `1px solid ${T.border}`,
                  color: T.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >Remove</button>
            </div>
          </div>
        ) : (
          <input
            className="bs-lnk-input"
            type="password"
            value={form.password === ' ' ? '' : (form.password || '')}
            onChange={(e: any) => setForm((f: any) => ({ ...f, password: e.target.value, clearPassword: false }))}
            placeholder={alreadyHasPassword ? 'Enter new password' : 'Enter password (leave blank for none)'}
            style={IS}
            autoComplete="new-password"
          />
        )}
      </div>

      <ToggleRow
       
        label="Link cloaking"
        hint="Keep the short URL in the address bar by loading the destination inside a frame."
        value={!!form.cloak}
        onChange={v => setForm((f: any) => ({ ...f, cloak: v }))}
      />

      <ToggleRow
       
        label="Hide referrer"
        hint="Strip the Referer header so the destination site doesn't see where visitors came from."
        value={!!form.hide_referrer}
        onChange={v => setForm((f: any) => ({ ...f, hide_referrer: v }))}
      />

      {form.cloak && (
        <div style={{
          padding: 12, borderRadius: 10,
          background: `rgba(var(--bs-warning-rgb), 0.08)`,
          border: `1px solid rgba(var(--bs-warning-rgb), 0.25)`,
          fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
        }}>
          <WarningIcon /> Many sites set <code>X-Frame-Options: DENY</code> which prevents cloaking.
          Test the link after enabling — if the destination goes blank, disable cloaking.
        </div>
      )}
    </FieldStack>
  )
}

// ── DEEP LINKS ──────────────────────────────────────────────────────
export function DeepLinksSection({ form, setForm, IS }: any) {
  return (
    <FieldStack>
      <SectionLabel>iOS</SectionLabel>
      <div>
        <Label hint="e.g. instagram://user?username=buysub">iOS URL scheme</Label>
        <input
          className="bs-lnk-input"
          value={form.deep_link_ios || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, deep_link_ios: e.target.value }))}
          placeholder="myapp://path"
          style={IS}
        />
      </div>
      <div>
        <Label hint="Used as fallback if the app isn't installed.">App Store ID</Label>
        <input
          className="bs-lnk-input"
          value={form.ios_app_store_id || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, ios_app_store_id: e.target.value }))}
          placeholder="id1234567890"
          style={IS}
        />
      </div>

      <div style={{ height: 1, background: T.border, margin: '8px 0' }} />
      <SectionLabel>Android</SectionLabel>
      <div>
        <Label hint="e.g. intent://... or a custom scheme.">Android deep link</Label>
        <input
          className="bs-lnk-input"
          value={form.deep_link_android || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, deep_link_android: e.target.value }))}
          placeholder="myapp://path"
          style={IS}
        />
      </div>
      <div>
        <Label hint="Used as Play Store fallback.">Package name</Label>
        <input
          className="bs-lnk-input"
          value={form.android_package || ''}
          onChange={(e: any) => setForm((f: any) => ({ ...f, android_package: e.target.value }))}
          placeholder="com.example.app"
          style={IS}
        />
      </div>

      <div style={{
        padding: 12, borderRadius: 10,
        background: `rgba(var(--bs-accent-rgb), 0.06)`,
        border: `1px solid rgba(var(--bs-accent-rgb), 0.2)`,
        fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
      }}>
        Desktop visitors always see the regular destination URL.
        Mobile visitors will be taken to the app — or to the App Store / Play Store
        if it isn't installed.
      </div>
    </FieldStack>
  )
}

// ── UTM ─────────────────────────────────────────────────────────────
export function UtmSection({ form, setForm, IS }: any) {
  const fields = [
    { key: 'utm_source',   label: 'utm_source',   placeholder: 'e.g. newsletter' },
    { key: 'utm_medium',   label: 'utm_medium',   placeholder: 'e.g. email' },
    { key: 'utm_campaign', label: 'utm_campaign', placeholder: 'e.g. black-friday' },
    { key: 'utm_content',  label: 'utm_content',  placeholder: 'e.g. header-cta' },
    { key: 'utm_term',     label: 'utm_term',     placeholder: 'e.g. keyword' },
  ]
  return (
    <FieldStack>
      <SectionLabel>UTM parameters</SectionLabel>
      <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>
        Appended to the destination URL when visitors click.
      </div>
      {fields.map(f => (
        <div key={f.key}>
          <Label>{f.label}</Label>
          <input
            className="bs-lnk-input"
            value={form[f.key] || ''}
            onChange={(e: any) => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            style={IS}
          />
        </div>
      ))}
    </FieldStack>
  )
}

// ── QR (inside drawer) ──────────────────────────────────────────────
export function QrSection({ form, setForm, IS }: any) {
  const cfg = form.qr_config || { fg: '#000000', bg: '#ffffff', ecc: 'M' }
  const shortUrl = form.slug ? `${SHORT_BASE}/${form.slug}` : ''

  const setCfg = (patch: any) =>
    setForm((f: any) => ({ ...f, qr_config: { ...cfg, ...patch } }))

  return (
    <FieldStack>
      <SectionLabel>QR code</SectionLabel>
      {!shortUrl ? (
        <div style={{
          padding: 20, textAlign: 'center',
          background: T.elevated, border: `1px solid ${T.border}`,
          borderRadius: 'var(--bs-radius-lg)', fontSize: 13, color: T.textMuted,
        }}>
          Set a slug first to generate a QR code.
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', justifyContent: 'center',
            padding: 20, background: T.elevated,
            border: `1px solid ${T.border}`, borderRadius: 'var(--bs-radius-lg)',
          }}>
            <QrPreview url={shortUrl} cfg={cfg} size={220} />
          </div>

          <FieldRow>
            <div>
              <Label>Foreground</Label>
              <ColorInput value={cfg.fg || '#000000'} onChange={v => setCfg({ fg: v })} />
            </div>
            <div>
              <Label>Background</Label>
              <ColorInput value={cfg.bg || '#ffffff'} onChange={v => setCfg({ bg: v })} />
            </div>
          </FieldRow>

          <div>
            <Label hint="Higher = more tolerant of logos/damage, but denser pattern.">
              Error correction
            </Label>
            <div style={{
              display: 'flex', gap: 4,
              background: T.elevated, border: `1px solid ${T.border}`,
              borderRadius: 999, padding: 4,
            }}>
              {(['L', 'M', 'Q', 'H'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setCfg({ ecc: level })}
                  style={{
                    flex: 1, height: 32, borderRadius: 999, border: 'none',
                    background: cfg.ecc === level ? T.accentFill : 'transparent',
                    color: cfg.ecc === level ? '#fff' : T.text,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >{level}</button>
              ))}
            </div>
          </div>

          <button
            onClick={() => downloadQr(shortUrl, cfg)}
            style={{
              height: 40, padding: '0 16px', borderRadius: 10,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >{<BtnLabel icon={<DownloadIcon/>}>Download QR (PNG)</BtnLabel>}</button>
        </>
      )}
    </FieldStack>
  )
}

// ════════════════════════════════════════════════════════════════════
// QR PRIMITIVES
// ════════════════════════════════════════════════════════════════════

export function QrPreview({
  url, cfg, size = 200,
}: {
  url: string
  cfg: { fg?: string; bg?: string; ecc?: 'L'|'M'|'Q'|'H' }
  size?: number
}) {
  // Use goqr.me service — no external npm dep. Accepts hex colors without #.
  const fg = (cfg.fg || '#000000').replace('#', '')
  const bg = (cfg.bg || '#ffffff').replace('#', '')
  const src = `https://api.qrserver.com/v1/create-qr-code/?` + new URLSearchParams({
    data: url,
    size: `${size}x${size}`,
    color: fg,
    bgcolor: bg,
    ecc: cfg.ecc || 'M',
    margin: '2',
    format: 'png',
  }).toString()
  return (
    <img
      src={src}
      alt="QR code"
      width={size}
      height={size}
      style={{ borderRadius: 'var(--bs-radius-lg)', display: 'block', background: cfg.bg || '#fff' }}
    />
  )
}

async function downloadQr(
  url: string,
  cfg: { fg?: string; bg?: string; ecc?: 'L'|'M'|'Q'|'H' }
) {
  const fg = (cfg.fg || '#000000').replace('#', '')
  const bg = (cfg.bg || '#ffffff').replace('#', '')
  const src = `https://api.qrserver.com/v1/create-qr-code/?` + new URLSearchParams({
    data: url,
    size: '1024x1024',
    color: fg,
    bgcolor: bg,
    ecc: cfg.ecc || 'M',
    margin: '2',
    format: 'png',
  }).toString()
  try {
    const res = await fetch(src)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const slug = url.split('/').pop() || 'qr'
    a.download = `buysub-qr-${slug}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } catch {
    window.open(src, '_blank')
  }
}

function ColorInput({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      height: 'var(--bs-control-md)', padding: '0 10px',
      background: T.elevated, border: `1px solid ${T.border}`,
      borderRadius: 10,
    }}>
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 28, height: 'var(--bs-control-sm)', padding: 0,
          border: 'none', borderRadius: 6,
          background: 'transparent', cursor: 'pointer',
        }}
      />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          flex: 1, height: 32, padding: '0 6px',
          background: 'transparent', border: 'none', outline: 'none',
          color: T.text, fontSize: 13,
          fontFamily: "'SF Mono', Menlo, monospace",
        }}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// QR DIALOG (invoked from list row)
// ════════════════════════════════════════════════════════════════════
function QrDialog({
  link, onClose, onSaveConfig,
}: {
  link: LinkRow
  onClose: () => void
  onSaveConfig: (cfg: any) => Promise<void>
}) {
  const [cfg, setCfg] = useState(link.qr_config || { fg: '#000000', bg: '#ffffff', ecc: 'M' as const })
  const url = `${SHORT_BASE}/${link.slug}`

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 250, padding: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 20, width: '100%', maxWidth: 420,
            padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontSize: 'var(--bs-text-lg)', fontWeight: 700, color: T.text }}>QR code</div>
            <div style={{
              fontSize: 12, color: T.textMuted,
              fontFamily: "'SF Mono', Menlo, monospace",
            }}>/{link.slug}</div>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'center',
            padding: 20, background: T.elevated,
            border: `1px solid ${T.border}`, borderRadius: 'var(--bs-radius-lg)',
          }}>
            <QrPreview url={url} cfg={cfg} size={220} />
          </div>

          <FieldRow>
            <div>
              <Label>Foreground</Label>
              <ColorInput value={cfg.fg || '#000'} onChange={v => setCfg(c => ({ ...c, fg: v }))} />
            </div>
            <div>
              <Label>Background</Label>
              <ColorInput value={cfg.bg || '#fff'} onChange={v => setCfg(c => ({ ...c, bg: v }))} />
            </div>
          </FieldRow>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, height: 'var(--bs-control-md)', borderRadius: 10,
                background: 'transparent', border: `1px solid ${T.border}`,
                color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >Close</button>
            <button
              onClick={() => downloadQr(url, cfg)}
              style={{
                flex: 1, height: 'var(--bs-control-md)', borderRadius: 10,
                background: 'transparent', border: `1px solid ${T.border}`,
                color: T.text, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >Download</button>
            <button
              onClick={async () => { await onSaveConfig(cfg); onClose() }}
              style={{
                flex: 1, height: 'var(--bs-control-md)', borderRadius: 10,
                background: T.accentFill, border: 'none', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >Save</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ════════════════════════════════════════════════════════════════════
// SMALL SHARED BUTTONS
// ════════════════════════════════════════════════════════════════════
function IconBtn({
  onClick, title, children,
}: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="bs-lnk-ghost"
      style={{
        width: 'var(--bs-control-sm)', height: 'var(--bs-control-sm)', borderRadius: 'var(--bs-radius-md)',
        background: 'transparent', border: `1px solid ${T.border}`,
        color: T.textSecondary, fontSize: 'var(--bs-text-sm)', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

function GhostBtn({
  onClick, children, variant,
}: {
  onClick: () => void
  children: React.ReactNode
  variant?: 'accent' | 'danger'
}) {
  const cls =
    variant === 'danger' ? 'bs-lnk-ghost-danger' :
    variant === 'accent' ? 'bs-lnk-ghost-accent' :
    'bs-lnk-ghost'
  return (
    <button
      onClick={onClick}
      className={cls}
      style={{
        height: 'var(--bs-control-sm)', padding: '0 var(--bs-space-3)', borderRadius: 'var(--bs-radius-md)',
        background: 'transparent', border: `1px solid ${T.border}`,
        color: T.text, fontSize: 'var(--bs-text-xs)', fontWeight: 600, cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
