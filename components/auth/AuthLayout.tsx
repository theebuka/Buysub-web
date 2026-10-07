'use client'

// The frame every auth screen shares: logo top-left, one card centred, the
// terms line under it. No site header, so nothing on these screens points at
// areas the visitor hasn't signed in to yet.

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { Icon, IconButton, Input } from '@/components/ui'
import { EXTERNAL, ROUTES } from '@/lib/routes'
import s from './auth.module.css'

export function AuthLayout({ children, wide, legal = true }: { children: ReactNode; wide?: boolean; legal?: boolean }) {
  return (
    <div className={s.page}>
      <header className={s.top}>
        <Link href={ROUTES.home} className={s.logo}><span className={s.logoMark} aria-hidden="true">B</span>BuySub</Link>
        <Link href={ROUTES.shop} className={s.topLink}>Back to shop</Link>
      </header>
      <main className={s.center}>
        <div className={`${s.card} ${wide ? s.cardWide : ''}`}>{children}</div>
        {legal && (
          <p className={s.legal}>
            By continuing you agree to BuySub’s <a href={EXTERNAL.site + '/terms'} target="_blank" rel="noreferrer">Terms</a> and <a href={EXTERNAL.privacy} target="_blank" rel="noreferrer">Privacy Policy</a>.
          </p>
        )}
      </main>
    </div>
  )
}

export function AuthAlert({ kind, children }: { kind: 'error' | 'ok'; children: ReactNode }) {
  return (
    <div className={`${s.alert} ${kind === 'error' ? s.alertError : s.alertOk}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon name={kind === 'error' ? 'alert' : 'check'} size={16} />
      <div>{children}</div>
    </div>
  )
}

/** Password input with a show/hide toggle. */
export function PasswordInput({ id, value, onChange, autoComplete, placeholder, describedBy, invalid }: {
  id: string; value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string; describedBy?: string; invalid?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className={s.pass}>
      <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete} placeholder={placeholder} aria-describedby={describedBy} aria-invalid={invalid || undefined} required />
      <span className={s.eye}>
        <IconButton icon={show ? 'eyeOff' : 'eye'} label={show ? 'Hide password' : 'Show password'} size="md" onClick={() => setShow(v => !v)} />
      </span>
    </div>
  )
}

export { s as authStyles }
