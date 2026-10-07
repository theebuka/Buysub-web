'use client'

// The admin console frame. Each section is its own route under /admin; this
// layout gates on a staff role and renders the shell. /admin/receipt sits
// outside the (console) group and keeps its own page.

import { Suspense } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { Button, ButtonLink, Skeleton } from '@/components/ui'
import { signOut } from '@/lib/session'
import { RequireRole, useSession } from '@/lib/useSession'
import { useApi } from '@/lib/useApi'
import { ADMIN_GROUPS, ADMIN_SECTIONS } from '../_lib/sections'
import s from '@/components/admin/admin.module.css'

function Loading() {
  return (
    <div className={s.app} aria-busy="true">
      <aside className={s.side} />
      <div className={s.main}>
        <div className={s.top} />
        <div className={s.content}>
          <Skeleton width={180} height={24} />
          <Skeleton height={88} radius="var(--bs-radius-lg)" />
          <Skeleton height={320} radius="var(--bs-radius-lg)" />
        </div>
      </div>
    </div>
  )
}

function NoAccess() {
  const session = useSession()
  return (
    <div className={s.app} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--bs-space-6)' }}>
      <div style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-3)' }}>
        <h1 className={s.h1}>No admin access</h1>
        <p className={s.secondary}>
          {session.user?.email || 'This account'} isn’t a staff account. Sign in with a staff account to use the admin console.
        </p>
        <div style={{ display: 'flex', gap: 'var(--bs-space-2)', marginTop: 'var(--bs-space-2)' }}>
          <Button size="md" onClick={async () => { await signOut(); window.location.href = '/login?next=%2Fadmin' }}>Switch account</Button>
          <ButtonLink href="/account" size="md" variant="secondary">My account</ButtonLink>
        </div>
      </div>
    </div>
  )
}

function Console({ children }: { children: React.ReactNode }) {
  const session = useSession()
  const { data: stats } = useApi<Record<string, any>>('/v2/admin/stats')
  const sections = ADMIN_SECTIONS.map(x => ({
    label: x.label, href: x.href, group: x.group, icon: x.icon,
    count: x.count ? Number(stats?.[x.count]) || 0 : undefined,
  }))
  return (
    <AdminShell sections={sections} groups={ADMIN_GROUPS} email={session.user?.email || ''} role={session.user?.role || ''}>
      <Suspense fallback={null}>{children}</Suspense>
    </AdminShell>
  )
}

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole allow="staff" loading={<Loading />} fallback={<NoAccess />}>
      <Console>{children}</Console>
    </RequireRole>
  )
}
