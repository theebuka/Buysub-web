'use client'

// /admin/notifications: site announcements (toast, modal or top banner)
// that components/AppShell.tsx polls from /v2/notifications. History is a
// table; composing and editing happen in a side panel with a live preview.
//
// Times: the inputs are datetime-local (the admin's own clock) and are sent
// as UTC ISO strings. They used to be sent raw, so Postgres read 14:00 Lagos
// as 14:00 UTC and everything ran an hour late.

import { useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button, Icon } from '@/components/ui'
import { DataTable, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { AreaField, FormSection, SelectField, SidePanel, TextField } from '@/components/admin/AdminForm'
import { Filters } from '@/components/admin/DataTable'
import { authFetch } from '@/lib/apiAuth'
import { fmtDateTime } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'

type Step = { title: string; message: string; image_url?: string }
type Notice = {
  id: string; title?: string | null; message?: string | null; type: 'toast' | 'modal' | 'banner'; active: boolean
  audience?: string; image_url?: string | null; image_position?: string; steps?: Step[] | null
  scheduled_for?: string | null; expires_at?: string | null; created_at: string
}
type Form = { title: string; message: string; type: string; audience: string; image_url: string; image_position: string; scheduled_for: string; expires_at: string; steps: Step[] }

const BLANK: Form = { title: '', message: '', type: 'modal', audience: 'all', image_url: '', image_position: 'top', scheduled_for: '', expires_at: '', steps: [] }
const TYPE_LABEL: Record<string, string> = { toast: 'Toast', modal: 'Modal', banner: 'Top banner' }
const AUDIENCE_LABEL: Record<string, string> = { all: 'Everyone', users: 'Signed-in customers', admins: 'Staff' }

const toLocal = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocal = (v: string) => v ? new Date(v).toISOString() : null

function stateOf(n: Notice): { label: string; tone: 'success' | 'neutral' | 'warning' } {
  const now = Date.now()
  if (!n.active) return { label: 'Off', tone: 'neutral' }
  if (n.expires_at && new Date(n.expires_at).getTime() <= now) return { label: 'Expired', tone: 'neutral' }
  if (n.scheduled_for && new Date(n.scheduled_for).getTime() > now) return { label: 'Scheduled', tone: 'warning' }
  return { label: 'Live', tone: 'success' }
}

function Preview({ f }: { f: Form }) {
  const steps = f.steps.filter(x => x.title || x.message)
  const title = steps[0]?.title || f.title
  const body = steps[0]?.message || f.message
  const box: React.CSSProperties = { border: '1px solid var(--bs-border-default)', borderRadius: 'var(--bs-radius-md)', background: 'var(--bs-bg-base)', padding: 'var(--bs-space-4)' }
  if (f.type === 'banner') {
    return (
      <div style={{ ...box, padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'var(--bs-accent-fill)', color: '#fff', fontSize: 'var(--bs-text-2xs)', padding: 'var(--bs-space-2) var(--bs-space-3)', display: 'flex', gap: 'var(--bs-space-2)', alignItems: 'flex-start' }}>
          <span style={{ flex: 1, textAlign: 'center' }}>{f.message || 'Banner text'}</span><Icon name="close" size={12} />
        </div>
        <div style={{ height: 48 }} />
      </div>
    )
  }
  if (f.type === 'toast') {
    return (
      <div style={{ ...box, display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', minHeight: 110 }}>
        <div style={{ maxWidth: 280, padding: 'var(--bs-space-3)', borderRadius: 'var(--bs-radius-md)', border: '1px solid var(--bs-border-default)', background: 'var(--bs-bg-card)', boxShadow: 'var(--bs-elev-2)' }}>
          <div style={{ fontSize: 'var(--bs-text-sm)' }}>{f.message || 'Toast text'}</div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ ...box, display: 'flex', justifyContent: 'center', padding: 'var(--bs-space-6)' }}>
      <div style={{ width: '100%', maxWidth: 320, borderRadius: 'var(--bs-radius-lg)', border: '1px solid var(--bs-border-default)', background: 'var(--bs-bg-card)', boxShadow: 'var(--bs-elev-2)', overflow: 'hidden' }}>
        {/^https?:\/\//.test(steps[0]?.image_url || f.image_url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={steps[0]?.image_url || f.image_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ padding: 'var(--bs-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-2)' }}>
          <div style={{ fontSize: 'var(--bs-text-base)', fontWeight: 600 }}>{title || 'Title'}</div>
          <div className={s.secondary} style={{ fontSize: 'var(--bs-text-sm)', whiteSpace: 'pre-wrap' }}>{body || 'Message'}</div>
          {steps.length > 1 && <div className={s.hint}>Step 1 of {steps.length}</div>}
          <div style={{ alignSelf: 'flex-end', marginTop: 'var(--bs-space-2)', height: 32, padding: '0 var(--bs-space-4)', display: 'inline-flex', alignItems: 'center', borderRadius: 'var(--bs-radius-md)', background: 'var(--bs-accent-fill)', color: '#fff', fontSize: 'var(--bs-text-xs)', fontWeight: 600 }}>{steps.length > 1 ? 'Next' : 'Got it'}</div>
        </div>
      </div>
    </div>
  )
}

function Composer({ editing, onClose, onSaved }: { editing: { id: string | null; form: Form } | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(BLANK)
  const [sending, setSending] = useState(false)
  const [lastId, setLastId] = useState<string | null | undefined>(undefined)
  // Reset the draft when a different record (or a new one) is opened.
  const key = editing ? editing.id ?? 'new' : undefined
  if (key !== lastId) { setLastId(key as any); if (editing) setForm(editing.form) }

  const set = (k: keyof Form) => (v: any) => setForm(f => ({ ...f, [k]: v }))
  const setStep = (i: number, k: keyof Step, v: string) => setForm(f => ({ ...f, steps: f.steps.map((x, j) => j === i ? { ...x, [k]: v } : x) }))
  const usesSteps = form.type === 'modal' && form.steps.length > 0
  const stepsOk = form.steps.every(x => x.title.trim() && x.message.trim())
  const valid = usesSteps ? stepsOk : !!form.message.trim()
  const windowError = form.scheduled_for && form.expires_at && new Date(form.expires_at) <= new Date(form.scheduled_for) ? 'Ends before it starts' : undefined

  const send = async () => {
    setSending(true)
    const body = {
      ...form,
      steps: usesSteps ? form.steps : null,
      message: usesSteps ? null : form.message,
      scheduled_for: fromLocal(form.scheduled_for),
      expires_at: fromLocal(form.expires_at),
    }
    const r = editing?.id
      ? await authFetch(`/v2/admin/notifications/${editing.id}`, { method: 'PATCH', body })
      : await authFetch('/v2/admin/notifications', { method: 'POST', body })
    setSending(false)
    if (!r.ok) { toast.error(r.error || 'Couldn’t save the notification'); return }
    toast.success(editing?.id ? 'Notification updated' : form.scheduled_for ? 'Notification scheduled' : 'Notification is live')
    onSaved()
  }

  return (
    <SidePanel open={!!editing} onClose={() => !sending && onClose()} width={640}
      title={editing?.id ? 'Edit notification' : 'New notification'}
      footer={<>
        <Button size="md" variant="secondary" onClick={onClose} disabled={sending}>Cancel</Button>
        <Button size="md" loading={sending} disabled={!valid || !!windowError} onClick={send}>
          {editing?.id ? 'Save changes' : form.scheduled_for ? 'Schedule' : 'Publish now'}
        </Button>
      </>}>
      <FormSection title="Format">
        <Filters label="Type" value={form.type} onChange={v => set('type')(v)} options={[
          { value: 'modal', label: 'Modal' }, { value: 'toast', label: 'Toast' }, { value: 'banner', label: 'Top banner' },
        ]} />
        <p className={s.hint}>
          {form.type === 'modal' ? 'A centred dialog the visitor has to close. Can have several steps.'
            : form.type === 'toast' ? 'A small popup in the corner with the message only. It goes away on its own.'
            : 'A thin bar above the site header until dismissed. Not shown in the admin console.'}
        </p>
        <SelectField label="Who sees it" value={form.audience} onChange={set('audience')} options={Object.entries(AUDIENCE_LABEL).map(([value, label]) => ({ value, label }))} />
      </FormSection>

      <FormSection title="Content">
        {form.type === 'modal' && <TextField label="Title" value={form.title} onChange={set('title')} placeholder="Optional" />}
        {!usesSteps && <AreaField label="Message" rows={form.type === 'modal' ? 4 : 2} value={form.message} onChange={set('message')} />}
        {form.type === 'modal' && (
          <>
            {form.steps.map((st, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-3)', paddingTop: 'var(--bs-space-3)', borderTop: '1px solid var(--bs-border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={s.strong} style={{ fontSize: 'var(--bs-text-sm)' }}>Step {i + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => setForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}>Remove</Button>
                </div>
                <TextField label="Title" value={st.title} onChange={v => setStep(i, 'title', v)} />
                <AreaField label="Message" rows={3} value={st.message} onChange={v => setStep(i, 'message', v)} />
                <TextField label="Image URL" value={st.image_url || ''} onChange={v => setStep(i, 'image_url', v.trim())} placeholder="Optional" />
              </div>
            ))}
            <div>
              <Button size="sm" variant="secondary" icon="plus" onClick={() => setForm(f => ({ ...f, steps: [...f.steps, { title: '', message: f.steps.length ? '' : f.message, image_url: '' }] }))}>
                {form.steps.length ? 'Add step' : 'Turn into steps'}
              </Button>
              {usesSteps && !stepsOk && <p className={s.hint} style={{ marginTop: 'var(--bs-space-2)' }}>Every step needs a title and a message.</p>}
            </div>
          </>
        )}
        {form.type === 'modal' && !usesSteps && (
          <div className={s.cols2}>
            <TextField label="Image URL" value={form.image_url} onChange={v => set('image_url')(v.trim())} placeholder="Optional" />
            <SelectField label="Image position" value={form.image_position} onChange={set('image_position')} options={[{ value: 'top', label: 'Top' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }]} />
          </div>
        )}
      </FormSection>

      <FormSection title="Timing" hint="In your local time. Leave both blank to show it now until it’s turned off.">
        <div className={s.cols2}>
          <TextField label="Starts" type="datetime-local" value={form.scheduled_for} onChange={set('scheduled_for')} />
          <TextField label="Ends" type="datetime-local" value={form.expires_at} onChange={set('expires_at')} error={windowError} />
        </div>
      </FormSection>

      <FormSection title="Preview">
        <Preview f={form} />
      </FormSection>
    </SidePanel>
  )
}

export function NotificationsTab() {
  const list = useAdminList<Notice>('/v2/admin/notifications', { limit: 50 })
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null)

  const toggle = async (n: Notice) => {
    const r = await authFetch(`/v2/admin/notifications/${n.id}`, { method: 'PUT', body: { active: !n.active } })
    if (r.ok) { list.patchRow(x => x.id === n.id, { active: !n.active }); toast.success(n.active ? 'Turned off' : 'Turned on') }
    else toast.error(r.error || 'Couldn’t update it')
  }
  const edit = (n: Notice) => setEditing({
    id: n.id,
    form: {
      title: n.title || '', message: n.message || '', type: n.type || 'modal', audience: n.audience || 'all',
      image_url: n.image_url || '', image_position: n.image_position || 'top',
      scheduled_for: toLocal(n.scheduled_for), expires_at: toLocal(n.expires_at),
      steps: Array.isArray(n.steps) ? n.steps.map(x => ({ title: x.title || '', message: x.message || '', image_url: x.image_url || '' })) : [],
    },
  })

  const columns: DTColumn<Notice>[] = [
    {
      key: 'content', header: 'Notification',
      cell: n => <div className={s.clip} style={{ maxWidth: 420 }}><CellTitle title={n.title || (n.steps?.length ? n.steps[0].title : '') || n.message || '-'}
        sub={n.steps?.length ? `${n.steps.length} steps` : n.title ? n.message : ''} /></div>,
    },
    { key: 'type', header: 'Type', cell: n => <span className={s.secondary}>{TYPE_LABEL[n.type] || n.type}</span> },
    { key: 'aud', header: 'Audience', cell: n => <span className={s.secondary}>{AUDIENCE_LABEL[n.audience || 'all'] || n.audience}</span> },
    {
      key: 'window', header: 'Runs',
      cell: n => <span className={s.secondary}>{n.scheduled_for || n.expires_at ? `${n.scheduled_for ? fmtDateTime(n.scheduled_for) : 'Now'} to ${n.expires_at ? fmtDateTime(n.expires_at) : 'no end'}` : `Since ${fmtDateTime(n.created_at)}`}</span>,
    },
    { key: 'state', header: 'Status', cell: n => { const st = stateOf(n); return <Badge tone={st.tone} dot>{st.label}</Badge> } },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', width: 170,
      cell: n => (
        <span style={{ display: 'inline-flex', gap: 'var(--bs-space-1)' }}>
          <Button size="sm" variant="ghost" onClick={() => toggle(n)}>{n.active ? 'Turn off' : 'Turn on'}</Button>
          <Button size="sm" variant="secondary" onClick={() => edit(n)}>Edit</Button>
        </span>
      ),
    },
  ]

  return (
    <>
      <AdminHead title="Notifications" lede="Announcements shown across the site. The newest five live ones are shown to each visitor."
        actions={<Button size="sm" icon="plus" onClick={() => setEditing({ id: null, form: BLANK })}>New notification</Button>} />
      <DataTable caption="Notifications" columns={columns} rows={list.rows} rowKey={n => n.id}
        loading={list.loading} error={list.error} onRetry={list.reload}
        empty={<TableState title="No notifications yet" action={<Button size="sm" icon="plus" onClick={() => setEditing({ id: null, form: BLANK })}>New notification</Button>}>Use one for sales, outages or new products.</TableState>} />
      <Composer editing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload() }} />
    </>
  )
}
