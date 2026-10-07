'use client'

// Admin console chrome: a grouped sidebar (drawer below 1024px) with
// needs-attention counts, a top bar with breadcrumbs and ⌘K search.
// The section list and counts are passed in by app/admin/(console)/layout.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Drawer, Icon, IconButton, Kbd, type IconName } from '@/components/ui'
import { useTheme } from '@/lib/theme'
import { signOut } from '@/lib/useSession'
import { AdminPalette } from './AdminPalette'
import s from './admin.module.css'

export type ShellSection = { label: string; href: string; group: string; icon: IconName; count?: number }

const isActive = (pathname: string, href: string) =>
  href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/')

function SideNav({ sections, groups, pathname, email, role, onNavigate }: {
  sections: ShellSection[]
  groups: string[]
  pathname: string
  email: string
  role: string
  onNavigate?: () => void
}) {
  const { isDark, toggle } = useTheme()
  return (
    <>
      <div className={s.brand}>
        <Link href="/admin" className={s.brandName} style={{ textDecoration: 'none' }} onClick={onNavigate}>BuySub</Link>
        <span className={s.brandTag}>Admin</span>
      </div>
      <nav className={s.navScroll} aria-label="Admin sections">
        {groups.map(g => (
          <div key={g} className={s.navGroup}>
            <span className={s.navGroupLabel}>{g}</span>
            {sections.filter(x => x.group === g).map(x => (
              <Link key={x.href} href={x.href} className={s.navLink} onClick={onNavigate}
                aria-current={isActive(pathname, x.href) ? 'page' : undefined}>
                <Icon name={x.icon} size={16} />
                {x.label}
                {!!x.count && <span className={s.navCount} aria-label={`${x.count} need attention`}>{x.count > 99 ? '99+' : x.count}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className={s.sideFoot}>
        <Link href="/admin/receipt" className={s.navLink} onClick={onNavigate}><Icon name="plus" size={16} />New receipt</Link>
        <Link href="/shop" className={s.navLink} onClick={onNavigate}><Icon name="external" size={16} />View store</Link>
        <button type="button" className={s.navLink} onClick={toggle} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
          <Icon name={isDark ? 'sun' : 'moon'} size={16} />{isDark ? 'Light theme' : 'Dark theme'}
        </button>
        <div className={s.who}>
          <span className={s.whoText}>
            <span className={s.whoName} title={email}>{email || 'Signed in'}</span>
            <span className={s.whoRole}>{role ? role.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : 'Staff'}</span>
          </span>
          <IconButton icon="logout" label="Sign out" size="sm" onClick={() => signOut('/login')} />
        </div>
      </div>
    </>
  )
}

export function AdminShell({ sections, groups, email, role, crumb, children }: {
  sections: ShellSection[]
  groups: string[]
  email: string
  role: string
  /** Trailing breadcrumb for detail pages (e.g. an order ref). */
  crumb?: string
  children: ReactNode
}) {
  const pathname = usePathname() || '/admin'
  const [menu, setMenu] = useState(false)
  const [palette, setPalette] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p) }
      else if (e.key === '/' && !palette) {
        const t = e.target as HTMLElement
        if (t.closest('input, textarea, select, [contenteditable="true"]')) return
        e.preventDefault(); setPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [palette])

  useEffect(() => { setMenu(false) }, [pathname])

  const current = sections.find(x => isActive(pathname, x.href))
  const detail = current && pathname !== current.href
    ? decodeURIComponent(pathname.slice(current.href.length + 1).split('/')[0] || '')
    : ''
  const trail = crumb || detail

  return (
    <div className={s.app}>
      <aside className={s.side}>
        <SideNav sections={sections} groups={groups} pathname={pathname} email={email} role={role} />
      </aside>
      <Drawer open={menu} onClose={() => setMenu(false)} label="Admin menu">
        <div className={s.sideDrawer}>
          <SideNav sections={sections} groups={groups} pathname={pathname} email={email} role={role} onNavigate={() => setMenu(false)} />
        </div>
      </Drawer>
      <div className={s.main}>
        <header className={s.top}>
          <IconButton icon="menu" label="Open menu" size="sm" className={s.menuBtn} onClick={() => setMenu(true)} />
          <nav aria-label="Breadcrumb" className={s.crumbs}>
            {current && current.href !== '/admin' ? (
              <>
                <Link href="/admin">Admin</Link>
                <Icon name="chevronRight" size={12} />
                {trail ? (
                  <Fragment>
                    <Link href={current.href}>{current.label}</Link>
                    <Icon name="chevronRight" size={12} />
                    <span aria-current="page">{trail}</span>
                  </Fragment>
                ) : <span aria-current="page">{current.label}</span>}
              </>
            ) : <span aria-current="page">Overview</span>}
          </nav>
          <span className={s.topSpacer} />
          <button type="button" className={s.searchBtn} onClick={() => setPalette(true)} aria-label="Search admin">
            <Icon name="search" size={14} />
            <span>Search orders, customers…</span>
            <Kbd>⌘K</Kbd>
          </button>
        </header>
        <main className={s.content}>{children}</main>
      </div>
      <AdminPalette open={palette} onClose={() => setPalette(false)} sections={sections} />
    </div>
  )
}
