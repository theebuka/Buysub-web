'use client'

// /partner chrome. Same quiet sidebar as /account (shared stylesheet), with
// the partner's store name and code at the top. Until the application is
// approved the portal shows its status instead of the sections.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { ButtonLink, CopyField, Icon, Skeleton, StatusBadge, type IconName } from '@/components/ui'
import { RequireRole, useSession } from '@/lib/useSession'
import { useSupportUnread } from '@/lib/support'
import { fmtDate, initials } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelError } from '@/components/account/AccountShell'
import { usePartner, referralLink } from './usePartner'
import s from '@/components/account/account.module.css'

const LINKS: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: ROUTES.partner.home, label: 'Overview', icon: 'home', exact: true },
  { href: ROUTES.partner.links, label: 'Referral links', icon: 'link' },
  { href: ROUTES.partner.conversions, label: 'Conversions', icon: 'trend' },
  { href: ROUTES.partner.payouts, label: 'Payouts', icon: 'wallet' },
  { href: ROUTES.partner.profile, label: 'Profile', icon: 'settings' },
  { href: ROUTES.partner.support, label: 'Support', icon: 'help' },
]

const active = (p: string, href: string, exact?: boolean) => exact ? p === href : p === href || p.startsWith(href + '/')

function Nav({ name, code, sections = true }: { name?: string; code?: string; sections?: boolean }) {
  const pathname = usePathname()
  const session = useSession()
  const unread = useSupportUnread(session.status === 'signed_in', 'partner')
  // Before approval every section shows the same status screen, so only
  // the way out (account, help) is offered.
  const links = sections ? LINKS : []
  return (
    <>
      <aside className={s.side} aria-label="Partner portal">
        <div className={s.who}>
          {name ? <span className={s.whoAvatar} aria-hidden="true">{initials(name)}</span> : <Skeleton width={36} height={36} radius="50%" />}
          <span className={s.whoText}>
            {name ? <span className={s.whoName}>{name}</span> : <Skeleton width={120} height={14} />}
            <span className={s.whoEmail}>{code ? `Code ${code}` : 'Partner portal'}</span>
          </span>
        </div>
        <nav>
          <ul className={s.nav}>
            {links.map(l => (
              <li key={l.href}>
                <Link href={l.href} className={s.navLink} aria-current={active(pathname, l.href, l.exact) ? 'page' : undefined}>
                  <Icon name={l.icon} size={16} />{l.label}
                  {l.href === ROUTES.partner.support && unread > 0 && <span className={s.navCount} aria-label={`${unread} unread`}>{unread}</span>}
                </Link>
              </li>
            ))}
            {links.length > 0 && <li className={s.navSep} role="separator" />}
            <li><Link href={ROUTES.account.home} className={s.navLink}><Icon name="user" size={16} />My account</Link></li>
            <li><Link href={ROUTES.help} className={s.navLink}><Icon name="help" size={16} />Help</Link></li>
          </ul>
        </nav>
      </aside>
      <nav className={s.tabs} aria-label="Partner sections">
        {links.map(l => (
          <Link key={l.href} href={l.href} className={s.tabLink} aria-current={active(pathname, l.href, l.exact) ? 'page' : undefined}>
            {l.label}{l.href === ROUTES.partner.support && unread > 0 && <span className={s.tabCount}>{unread}</span>}
          </Link>
        ))}
      </nav>
    </>
  )
}

function StatusScreen({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.main}>
      <PageHead title={title} />
      <div className={`${s.panel} ${s.panelPad}`} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bs-space-3)', maxWidth: 640 }}>
        {children}
        {action && <div style={{ marginTop: 'var(--bs-space-2)' }}>{action}</div>}
      </div>
    </div>
  )
}

function Gate({ children }: { children: ReactNode }) {
  const { profile, affiliate, loading, error, reload } = usePartner()

  if (loading) {
    return (
      <div className={s.main} aria-busy="true">
        <Skeleton width={200} height={28} />
        <Skeleton height={88} radius="var(--bs-radius-lg)" />
        <Skeleton height={220} radius="var(--bs-radius-lg)" />
      </div>
    )
  }
  if (error) return <div className={s.main}><div className={s.panel}><PanelError message={error} onRetry={reload} /></div></div>

  if (!profile) {
    return (
      <StatusScreen title="Partner programme"
        action={<ButtonLink href={ROUTES.partner.apply} iconRight="arrowRight">Apply to become a partner</ButtonLink>}>
        <p className={s.secondary}>This account isn’t a BuySub partner yet. Partners earn a commission on every order placed through their referral link.</p>
      </StatusScreen>
    )
  }
  if (profile.status === 'pending_review' || profile.status === 'pending') {
    return (
      <StatusScreen title="Application received">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bs-space-3)' }}><StatusBadge status="pending_review" />{profile.created_at && <span className={s.muted}>Submitted {fmtDate(profile.created_at)}</span>}</div>
        <p className={s.secondary}>We’re reviewing <b style={{ color: 'var(--bs-text-primary)' }}>{profile.store_name || profile.legal_name}</b>. We’ll email {profile.owner_email || 'you'} when it’s done, and your referral link will appear here.</p>
      </StatusScreen>
    )
  }
  if (profile.status === 'rejected') {
    return (
      <StatusScreen title="Application not approved"
        action={<ButtonLink href={ROUTES.help} variant="secondary">Contact us</ButtonLink>}>
        <StatusBadge status="rejected" />
        {profile.reviewer_notes && <p className={s.secondary}><b style={{ color: 'var(--bs-text-primary)' }}>Reason:</b> {profile.reviewer_notes}</p>}
        <p className={s.secondary}>If something has changed, or you think this is a mistake, get in touch and we’ll take another look.</p>
      </StatusScreen>
    )
  }
  if (!affiliate) {
    return (
      <StatusScreen title="Setting up your account"
        action={<ButtonLink href={ROUTES.help} variant="secondary">Contact us</ButtonLink>}>
        <p className={s.secondary}>Your application is approved, but your referral code hasn’t been issued yet. This usually means we still need to finish setup on our side.</p>
      </StatusScreen>
    )
  }
  return <div className={s.main}>{children}</div>
}

function Frame({ children }: { children: ReactNode }) {
  const { profile, affiliate, loading } = usePartner()
  return (
    <div className={s.shell}>
      <Nav name={affiliate?.display_name || profile?.store_name || profile?.legal_name || (loading ? undefined : 'BuySub partners')} code={affiliate?.referral_code} sections={loading || !!affiliate} />
      <Gate>{children}</Gate>
    </div>
  )
}

export default function PartnerShell({ children }: { children: ReactNode }) {
  return (
    <RequireRole loading={<div className={s.shell}><Nav /><div className={s.main}><Skeleton width={200} height={28} /></div></div>}>
      <Frame>{children}</Frame>
    </RequireRole>
  )
}

/** The partner's main link with copy and WhatsApp share. */
export function MainLink({ code }: { code: string }) {
  const url = referralLink(code, '/shop')
  const wa = `https://wa.me/?text=${encodeURIComponent(`Get your subscriptions in Naira on BuySub: ${url}`)}`
  return (
    <div style={{ display: 'flex', gap: 'var(--bs-space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
      <div style={{ flex: '1 1 320px', minWidth: 0 }}><CopyField value={url} label="Copy referral link" /></div>
      <ButtonLink href={wa} external variant="secondary" size="lg">Share on WhatsApp</ButtonLink>
    </div>
  )
}
