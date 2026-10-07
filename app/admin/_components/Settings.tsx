'use client'

// /admin/settings: service switches and programmes (ServiceSettings), then
// store contact details and the receipt caption. Nothing reads the store
// details yet (app/admin/receipt has the social line commented out).

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Skeleton } from '@/components/ui'
import { AdminHead, Panel, adminStyles as s } from '@/components/admin/AdminUI'
import { AreaField, FormSection, TextField } from '@/components/admin/AdminForm'
import { TableState } from '@/components/admin/DataTable'
import { authFetch } from '@/lib/apiAuth'
import { ServiceSettings } from './ServiceSettings'

type Settings = Record<string, string>

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState<Settings>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setError('')
    authFetch<Settings>('/v2/admin/settings').then(r => {
      if (r.ok && r.data && !Array.isArray(r.data)) { setSettings(r.data); setSaved(r.data) }
      else if (r.ok) { setSettings({}); setSaved({}) }
      else setError(r.error || 'Could not load settings.')
    })
  }
  useEffect(load, [])

  const set = (k: string) => (v: string) => setSettings(x => ({ ...(x || {}), [k]: v }))
  const dirty = settings && JSON.stringify(settings) !== JSON.stringify(saved)
  const save = async () => {
    if (!settings) return
    setSaving(true)
    const r = await authFetch('/v2/admin/settings', { method: 'PATCH', body: settings })
    setSaving(false)
    if (r.ok) { toast.success('Settings saved'); setSaved(settings) } else toast.error(r.error || 'Couldn’t save settings')
  }

  return (
    <>
      <AdminHead title="Settings" lede="Switch services on and off, run the customer and partner programmes, and keep store details." />
      <ServiceSettings />
      {error ? <Panel><TableState error title="Couldn’t load settings" action={<Button size="sm" variant="secondary" onClick={load}>Try again</Button>}>{error}</TableState></Panel>
        : !settings ? <Skeleton height={320} radius="var(--bs-radius-lg)" />
        : (
          <Panel style={{ maxWidth: 760 }} title="Store details"
            action={<Button size="sm" loading={saving} disabled={!dirty} onClick={save}>Save changes</Button>}>
            <p className={s.secondary} style={{ padding: 'var(--bs-space-4) var(--bs-space-6) 0' }}>Saved, but not shown anywhere yet.</p>
            <form onSubmit={e => { e.preventDefault(); save() }}>
              <FormSection title="Contact">
                <div className={s.cols2}>
                  <TextField label="Phone" type="tel" value={settings.phone} onChange={set('phone')} />
                </div>
              </FormSection>
              <FormSection title="Social profiles" hint="Full profile links.">
                <div className={s.cols2}>
                  <TextField label="Instagram" value={settings.instagram} onChange={set('instagram')} placeholder="https://instagram.com/…" />
                  <TextField label="Facebook" value={settings.facebook} onChange={set('facebook')} placeholder="https://facebook.com/…" />
                  <TextField label="X" value={settings.x} onChange={set('x')} placeholder="https://x.com/…" />
                  <TextField label="TikTok" value={settings.tiktok} onChange={set('tiktok')} placeholder="https://tiktok.com/@…" />
                </div>
              </FormSection>
              <FormSection title="Receipts">
                <AreaField label="Receipt caption" hint="Optional line for the foot of receipts." rows={3} value={settings.receipt_caption} onChange={set('receipt_caption')} />
              </FormSection>
              <button type="submit" hidden />
            </form>
          </Panel>
        )}
    </>
  )
}
