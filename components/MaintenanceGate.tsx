'use client'

// Shows the maintenance page in place of the storefront while admins have
// maintenance mode on (Settings → Service switches). Staff, /admin and the
// sign-in pages pass through, so the site can be checked and switched back.

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { ButtonLink, EmptyState } from '@/components/ui'
import { useSiteStatus } from '@/lib/siteStatus'
import { useSession } from '@/lib/useSession'
import { EXTERNAL, isStaff } from '@/lib/routes'

const EXEMPT = ['/admin', '/login', '/reset-password']

function Gate({ message, children }: { message: string; children: ReactNode }) {
  const session = useSession()
  if (session.status === 'loading') return null
  if (session.status === 'signed_in' && isStaff(session.user?.role)) return <>{children}</>
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'var(--bs-space-12) 0' }}>
      <EmptyState icon="tool" title="We’ll be back shortly"
        action={<ButtonLink href={EXTERNAL.contact} external variant="secondary">Contact support</ButtonLink>}>
        {message || 'BuySub is down for planned maintenance. Your orders and wallet are safe. Please check back soon.'}
      </EmptyState>
    </div>
  )
}

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const status = useSiteStatus()
  const pathname = usePathname() || '/'
  if (!status.maintenance.enabled || EXEMPT.some(p => pathname.startsWith(p))) return <>{children}</>
  return <Gate message={status.maintenance.message}>{children}</Gate>
}
