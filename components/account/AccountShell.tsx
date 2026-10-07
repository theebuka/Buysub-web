'use client'

// /account chrome: a quiet text sidebar on desktop, an underlined tab strip
// on phones. The site header stays above it (AppShell renders it).

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Icon, Skeleton, type IconName } from '@/components/ui'
import { RequireRole, useSession } from '@/lib/useSession'
import { useApi } from '@/lib/useApi'
import { useInbox } from '@/lib/inbox'
import { useSiteStatus } from '@/lib/siteStatus'
import { ROUTES } from '@/lib/routes'
import { markedRead } from './readState'
import s from './account.module.css'

type NavLink = { href: string; label: string; icon: IconName; exact?: boolean; flag?: 'referrals' }
const LINKS: NavLink[] = [
  { href: ROUTES.account.home, label: 'Overview', icon: 'home', exact: true },
  { href: ROUTES.account.orders, label: 'Orders', icon: 'receipt' },
  { href: ROUTES.account.subscriptions, label: 'Subscriptions', icon: 'clock' },
  { href: ROUTES.account.wallet, label: 'Wallet', icon: 'wallet' },
  { href: ROUTES.account.notifications, label: 'Notifications', icon: 'bell' },
  { href: ROUTES.account.messages, label: 'Messages', icon: 'message' },
  { href: ROUTES.account.referrals, label: 'Refer and earn', icon: 'gift', flag: 'referrals' },
  { href: ROUTES.account.settings, label: 'Settings', icon: 'settings' },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
}

export function useUnreadCount(): number {
  const { data } = useApi<any[]>('/v2/me/messages')
  // Messages opened this page load count as read before the refetch lands.
  return (data || []).filter(m => !m.is_read && !markedRead.has(m.id)).length
}

function Nav() {
  const pathname = usePathname()
  const session = useSession()
  const unreadMessages = useUnreadCount()
  const inbox = useInbox(session.status === 'signed_in')
  const status = useSiteStatus()
  const u = session.user
  const links = LINKS.filter(l => !l.flag || status.services[l.flag])
  const countFor = (href: string) =>
    href === ROUTES.account.messages ? unreadMessages
      : href === ROUTES.account.notifications ? (inbox.data?.unread ?? 0)
      : 0
  return (
    <>
      <aside className={s.side} aria-label="Account">
        <div className={s.who}>
          {u ? <>
            <span className={s.whoName}>{u.full_name || 'Your account'}</span>
            <span className={s.whoEmail}>{u.email}</span>
          </> : <><Skeleton width={120} height={14} /><Skeleton width={160} height={12} /></>}
        </div>
        <nav>
          <ul className={s.nav}>
            {links.map(l => (
              <li key={l.href}>
                <Link href={l.href} className={s.navLink} aria-current={isActive(pathname, l.href, l.exact) ? 'page' : undefined}>
                  <Icon name={l.icon} size={16} />{l.label}
                  {countFor(l.href) > 0 && <span className={s.navCount}>{countFor(l.href)}</span>}
                </Link>
              </li>
            ))}
            <li className={s.navSep} role="separator" />
            <li><Link href={ROUTES.help} className={s.navLink}><Icon name="help" size={16} />Help</Link></li>
          </ul>
        </nav>
      </aside>
      <nav className={s.tabs} aria-label="Account sections">
        {links.map(l => (
          <Link key={l.href} href={l.href} className={s.tabLink} aria-current={isActive(pathname, l.href, l.exact) ? 'page' : undefined}>
            {l.label}{countFor(l.href) > 0 ? ` (${countFor(l.href)})` : ''}
          </Link>
        ))}
      </nav>
    </>
  )
}

function Loading() {
  return (
    <div className={s.main} aria-busy="true">
      <Skeleton width={180} height={28} />
      <Skeleton height={104} radius="var(--bs-radius-lg)" />
      <Skeleton height={220} radius="var(--bs-radius-lg)" />
    </div>
  )
}

export default function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div className={s.shell}>
      <Nav />
      <RequireRole loading={<Loading />}>
        <div className={s.main}>{children}</div>
      </RequireRole>
    </div>
  )
}

export function PageHead({ title, lede, actions, back }: { title: ReactNode; lede?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div>
      {back && <Link href={back.href} className={s.back}><Icon name="chevronLeft" size={14} />{back.label}</Link>}
      <div className={s.head}>
        <div style={{ minWidth: 0 }}>
          <h1 className={s.h1}>{title}</h1>
          {lede && <p className={s.lede}>{lede}</p>}
        </div>
        {actions}
      </div>
    </div>
  )
}

/** In-panel empty state: left-aligned, one line of guidance, one action. */
export function PanelEmpty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <p className={s.emptyTitle}>{title}</p>
      {children && <p className={s.secondary}>{children}</p>}
      {action && <div style={{ marginTop: 'var(--bs-space-2)' }}>{action}</div>}
    </div>
  )
}

export function PanelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={s.empty}>
      <p className={s.emptyTitle}>Couldn’t load this</p>
      <p className={s.secondary}>{message}</p>
      <button type="button" className={s.textLink} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }} onClick={onRetry}>Try again</button>
    </div>
  )
}

export function RowsSkeleton({ n = 3 }: { n?: number }) {
  return (
    <ul className={s.rows} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className={s.row}>
          <Skeleton width={36} height={36} radius="var(--bs-radius-md)" />
          <div className={s.rowMain}><Skeleton width="40%" height={14} /><Skeleton width="25%" height={12} /></div>
          <Skeleton width={70} height={14} />
        </li>
      ))}
    </ul>
  )
}
