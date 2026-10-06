'use client'

// Profile (PATCH /v2/me), password (Supabase: verify the current one, then
// updateUser, as the old dashboard did), appearance and sign-out. Each is its
// own form with its own save, so one failing never discards another's edits.

import { useEffect, useState, type ReactNode } from 'react'
import { Button, Field, Input, SegmentedControl } from '@/components/ui'
import { authFetch } from '@/lib/apiAuth'
import { getSupabase } from '@/lib/session'
import { useSession, signOut, reloadSession } from '@/lib/useSession'
import { useTheme } from '@/lib/theme'
import { PageHead } from './AccountShell'
import s from './account.module.css'

function Row({ title, desc, children }: { title: string; desc: ReactNode; children: ReactNode }) {
  return (
    <section className={s.setRow}>
      <div>
        <h2 className={s.h2}>{title}</h2>
        <p className={s.secondary} style={{ marginTop: 4, lineHeight: 1.5 }}>{desc}</p>
      </div>
      <div className={s.setForm}>{children}</div>
    </section>
  )
}

function Profile() {
  const session = useSession()
  const u = session.user
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => { if (u) { setName(u.full_name); setPhone(u.phone) } }, [u?.id])

  const dirty = !!u && (name.trim() !== u.full_name || phone.trim() !== u.phone)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setMsg({ ok: false, text: 'Enter your name.' }); return }
    setBusy(true); setMsg(null)
    const r = await authFetch('/v2/me', { method: 'PATCH', body: { full_name: name.trim(), phone: phone.trim() } })
    if (r.ok) await reloadSession()
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: r.error || 'Couldn’t save. Try again.' })
  }
  return (
    <form onSubmit={save} style={{ display: 'contents' }}>
      <Field label="Full name">{p => <Input {...p} autoComplete="name" value={name} onChange={e => { setName(e.target.value); setMsg(null) }} />}</Field>
      <Field label="Phone (WhatsApp)" hint="Used to deliver your subscriptions and reach you about orders.">
        {p => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => { setPhone(e.target.value); setMsg(null) }} />}
      </Field>
      <Field label="Email" hint="Orders are matched to this address. Contact support to change it.">
        {p => <Input {...p} value={u?.email || ''} readOnly disabled />}
      </Field>
      <div className={s.setActions}>
        <Button type="submit" size="md" loading={busy} disabled={!dirty}>Save changes</Button>
        {msg && <span className={msg.ok ? s.ok : s.err} role="status">{msg.text}</span>}
      </div>
    </form>
  )
}

function Password() {
  const session = useSession()
  const [f, setF] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF(p => ({ ...p, [k]: e.target.value })); setMsg(null) }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.current) return setMsg({ ok: false, text: 'Enter your current password.' })
    if (f.next.length < 8) return setMsg({ ok: false, text: 'Use at least 8 characters for the new password.' })
    if (f.next !== f.confirm) return setMsg({ ok: false, text: 'The new passwords don’t match.' })
    setBusy(true)
    const sb = getSupabase()
    const { error: authErr } = await sb.auth.signInWithPassword({ email: session.user?.email || '', password: f.current })
    if (authErr) { setBusy(false); return setMsg({ ok: false, text: 'Your current password is incorrect.' }) }
    const { error } = await sb.auth.updateUser({ password: f.next })
    setBusy(false)
    if (error) return setMsg({ ok: false, text: error.message })
    setF({ current: '', next: '', confirm: '' })
    setMsg({ ok: true, text: 'Password changed.' })
  }
  return (
    <form onSubmit={save} style={{ display: 'contents' }}>
      <Field label="Current password">{p => <Input {...p} type="password" autoComplete="current-password" value={f.current} onChange={set('current')} />}</Field>
      <Field label="New password" hint="At least 8 characters.">{p => <Input {...p} type="password" autoComplete="new-password" value={f.next} onChange={set('next')} />}</Field>
      <Field label="Confirm new password">{p => <Input {...p} type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />}</Field>
      <div className={s.setActions}>
        <Button type="submit" size="md" variant="secondary" loading={busy}>Change password</Button>
        {msg && <span className={msg.ok ? s.ok : s.err} role="status">{msg.text}</span>}
      </div>
    </form>
  )
}

function Appearance() {
  const { theme, toggle, mounted } = useTheme()
  return (
    <SegmentedControl label="Theme" value={mounted ? theme : 'dark'}
      onChange={v => { if (v !== theme) toggle() }}
      options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
  )
}

export default function Settings() {
  return (
    <>
      <PageHead title="Settings" />
      <div className={s.settings}>
        <Row title="Profile" desc="How we address you and where we deliver."><Profile /></Row>
        <Row title="Password" desc="You’ll stay signed in on this device after changing it."><Password /></Row>
        <Row title="Appearance" desc="Applies across BuySub on this device."><Appearance /></Row>
        <Row title="Sign out" desc="Sign out of BuySub on this device.">
          <div><Button variant="secondary" size="md" icon="logout" onClick={() => signOut()}>Sign out</Button></div>
        </Row>
      </div>
    </>
  )
}
