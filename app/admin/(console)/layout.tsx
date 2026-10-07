'use client'

// The admin console frame. Each section is its own route under /admin; this
// layout owns the session check and the shell. /admin/receipt sits outside the
// (console) group and keeps its own page.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shell, T, readAdminEmail, readToken, useClientValue, useTheme } from '../_lib/shared'
import { ADMIN_SECTIONS } from '../_lib/sections'

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const { isDark, toggle, mounted } = useTheme()
  const [token, setToken] = useState('')
  const adminEmail = useClientValue(readAdminEmail, '')
  const pathname = usePathname() || '/admin'

  useEffect(() => {
    try { setToken(readToken()) } catch {}
    const iv = setInterval(() => { try { if (!readToken()) setToken('') } catch {} }, 15000)
    return () => clearInterval(iv)
  }, [])

  if (!mounted) return null

  if (!token) return (
    <Shell isDark={isDark} toggle={toggle} adminEmail="">
      <div style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: T.text, marginBottom: 8 }}>Admin Access Required</div>
        <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 24 }}>Session expired or not logged in.</div>
        <a href="/login" style={{ display: 'inline-block', padding: '12px 32px', borderRadius: 10, background: 'var(--bs-accent-fill)', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Sign In</a>
      </div>
    </Shell>
  )

  return (
    <Shell isDark={isDark} toggle={toggle} adminEmail={adminEmail}>
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 28, overflowX: 'auto', paddingBottom: 0 }}>
        {ADMIN_SECTIONS.map(s => {
          const active = s.href === '/admin' ? pathname === '/admin' : pathname.startsWith(s.href)
          return (
            <Link key={s.href} href={s.href} style={{
              padding: '12px 18px', fontSize: 13, cursor: 'pointer', background: 'transparent', textDecoration: 'none',
              color: active ? T.accent : T.textMuted, borderBottom: active ? `2px solid ${T.accent}` : '2px solid transparent',
              fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>{s.label}</Link>
          )
        })}
      </div>
      {children}
    </Shell>
  )
}
