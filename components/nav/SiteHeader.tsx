'use client'

// ============================================================
// BUYSUB — Site header (public and customer pages)
// ============================================================
// Replaces components/Navbar.tsx. 64px tall (--bs-header-h) and sticky, so the
// shop's own sticky control bar still docks directly under it at top: 64.
//
//   desktop  Logo · Browse ▾ · [ Search … ⌘K ] · Earn · theme · NGN ▾ · cart · account
//   mobile   ☰ · Logo ·                      search · cart · account
//
// The cart drawer is mounted here, once, for the whole site. The currency
// menu sets the display currency everywhere (lib/currency.ts). No
// notification bell until there is a per-user notifications endpoint;
// messages are in the account menu.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Button, ButtonLink, Drawer, DrawerBody, Icon, IconButton, Kbd, MenuItem, MenuLabel, MenuSeparator,
  Popover, ProductLogo, Skeleton, type IconName,
} from '@/components/ui'
import { CommandPalette } from './CommandPalette'
import { useCart, cartCount, setCartDrawer } from '@/lib/cart'
import { useCurrency, setCurrency, CURRENCIES, CURRENCY_LABELS } from '@/lib/currency'
import { productHref } from '@/lib/catalog'
import CartDrawer from '@/components/shop/CartDrawer'
import { useSession, loadPartner, loadWallet, signOut, type SessionState } from '@/lib/useSession'
import { useProducts } from '@/lib/useProducts'
import { useTheme, isThemeableRoute } from '@/lib/theme'
import { getCategoryList, isInStock, TAB_ORDER, format, type Product } from '@/lib/constants'
import { fromPrice } from '@/lib/pricing'
import { fmtNGN, initials, categoryLabel } from '@/lib/format'
import { ROUTES, EXTERNAL, isStaff } from '@/lib/routes'
import { shop } from '@/lib/shopBus'
import css from './nav.module.css'

// ── Logo ─────────────────────────────────────────────────────
export function Logo() {
  return (
    <Link href={ROUTES.home} className={css.logo} aria-label="BuySub home">
      <span className={css.logoMark} aria-hidden="true">B</span>
      <span>BuySub</span>
    </Link>
  )
}

// ── Theme toggle ─────────────────────────────────────────────
// Hidden on routes the theme can't reach yet (the shop, until Phase 2).
function ThemeToggle() {
  const pathname = usePathname()
  const { isDark, toggle, mounted } = useTheme()
  if (!isThemeableRoute(pathname)) return null
  return (
    <IconButton
      icon={mounted && !isDark ? 'moon' : 'sun'}
      label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggle}
    />
  )
}

// ── Categories from the product list ─────────────────────────
function useCategories(products: Product[]) {
  return useMemo(() => {
    const by: Record<string, Product[]> = {}
    for (const p of products) for (const c of getCategoryList(p)) (by[c] ||= []).push(p)
    const order = TAB_ORDER.filter(c => c !== 'all' && by[c])
    const extra = Object.keys(by).filter(c => !TAB_ORDER.includes(c)).sort()
    return [...order, ...extra].map(c => ({
      key: c,
      products: by[c]
        .slice()
        .sort((a, b) => Number(isInStock(b.stock_status)) - Number(isInStock(a.stock_status)) || (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }))
  }, [products])
}

// ── Browse mega menu ─────────────────────────────────────────
function BrowsePanel({ close }: { close: () => void }) {
  const { products, loading } = useProducts()
  const cats = useCategories(products)
  const [active, setActive] = useState<string | null>(null)
  const current = cats.find(c => c.key === active) ?? cats[0]

  if (loading) {
    return (
      <div className={css.mega}>
        <div className={css.megaCats}>{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} height={36} />)}</div>
        <div className={css.megaBody}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={56} />)}</div>
      </div>
    )
  }
  if (!cats.length) return <p className={css.megaEmpty}>Products couldn’t be loaded. Try again shortly.</p>

  return (
    <div className={css.mega}>
      <ul className={css.megaCats} role="list">
        {cats.map(c => (
          <li key={c.key}>
            <button
              type="button"
              data-menu-item
              className={css.megaCat}
              aria-current={current?.key === c.key ? 'true' : undefined}
              onMouseEnter={() => setActive(c.key)}
              onFocus={() => setActive(c.key)}
              onClick={() => { close(); shop.category(c.key) }}
            >
              <span>{categoryLabel(c.key)}</span>
              <span className={css.megaCount}>{c.products.length}</span>
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <div className={css.megaBody}>
          <div className={css.megaHead}>
            <span>{categoryLabel(current.key)}</span>
            <button type="button" className={css.megaAll} onClick={() => { close(); shop.category(current.key) }}>
              View all <Icon name="arrowRight" size={14} />
            </button>
          </div>
          <div className={css.megaGrid}>
            {current.products.slice(0, 8).map(p => {
              const fp = fromPrice(p)
              const stock = isInStock(p.stock_status)
              return (
                <Link key={p.id} href={productHref(p)} data-menu-item className={css.megaProduct} onClick={close}>
                  <ProductLogo product={p} size={40} radius="var(--bs-radius-md)" />
                  <span className={css.megaProductText}>
                    <span className={css.megaProductName}>{p.name}</span>
                    <span className={css.megaProductPrice}>
                      {!stock ? 'Out of stock' : fp ? <>From <b>{format(fp.price, 'NGN')}</b></> : 'Currently unavailable'}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function BrowseMenu() {
  return (
    <Popover
      align="start"
      panelLabel="Browse categories"
      panelClassName={css.megaPanel}
      trigger={({ open, toggle, props }) => (
        <button type="button" className={css.navBtn} onClick={toggle} {...props}>
          <Icon name="grid" size={16} /> Browse
          <Icon name="chevronDown" size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform var(--bs-dur-2)' }} />
        </button>
      )}
    >
      {close => <BrowsePanel close={close} />}
    </Popover>
  )
}

// ── Account menu ─────────────────────────────────────────────
function Avatar({ user, size = 32 }: { user: NonNullable<SessionState['user']>; size?: number }) {
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt="" width={size} height={size} className={css.avatar} style={{ width: size, height: size }} />
  }
  return <span className={css.avatar} style={{ width: size, height: size }} aria-hidden="true">{initials(user.full_name || user.email)}</span>
}

function AccountLinks({ session, close }: { session: SessionState; close: () => void }) {
  const role = session.user?.role
  const partner = session.partner
  const links: { href: string; label: string; icon: IconName }[] = [
    { href: ROUTES.account.home, label: 'My account', icon: 'user' },
    { href: ROUTES.account.orders, label: 'Orders', icon: 'receipt' },
    { href: ROUTES.account.wallet, label: 'Wallet', icon: 'wallet' },
    { href: ROUTES.account.messages, label: 'Messages', icon: 'message' },
    { href: ROUTES.account.settings, label: 'Settings', icon: 'settings' },
  ]
  return (
    <>
      {links.map(l => <MenuItem key={l.label} href={l.href} icon={l.icon} onClick={close}>{l.label}</MenuItem>)}
      {(partner || isStaff(role)) && <MenuSeparator />}
      {partner && <MenuItem href={ROUTES.partner.home} icon="users" onClick={close}>Partner portal</MenuItem>}
      {isStaff(role) && <MenuItem href={ROUTES.admin.home} icon="layout" onClick={close}>Admin console</MenuItem>}
    </>
  )
}

function AccountPanel({ session, close }: { session: SessionState; close: () => void }) {
  const user = session.user!
  useEffect(() => { loadWallet(); loadPartner() }, [])
  return (
    <>
      <div className={css.acctHead}>
        <Avatar user={user} size={40} />
        <div style={{ minWidth: 0 }}>
          <div className={css.acctName}>{user.full_name || 'Your account'}</div>
          <div className={css.acctEmail}>{user.email}</div>
        </div>
      </div>
      <Link href={ROUTES.account.wallet} className={css.walletCard} onClick={close} data-menu-item>
        <span>
          <span className={css.walletLabel}>Wallet balance</span>
          <span className={css.walletValue}>{session.walletNGN === null ? <Skeleton width={80} height={20} /> : fmtNGN(session.walletNGN)}</span>
        </span>
        <Icon name="chevronRight" size={16} />
      </Link>
      <Link href={session.partner ? ROUTES.partner.home : ROUTES.partner.apply} className={css.inviteCard} onClick={close} data-menu-item>
        <Icon name="gift" size={18} />
        <span style={{ flex: 1 }}>
          <span className={css.inviteTitle}>Invite & earn</span>
          <span className={css.inviteText}>{session.partner ? 'Share your link and track earnings' : 'Earn commission on every sale you refer'}</span>
        </span>
        <Icon name="chevronRight" size={16} />
      </Link>
      <MenuSeparator />
      <AccountLinks session={session} close={close} />
      <MenuSeparator />
      <MenuItem icon="logout" danger onClick={() => { close(); signOut() }}>Log out</MenuItem>
    </>
  )
}

function AccountMenu({ session }: { session: SessionState }) {
  if (session.status === 'loading') return <Skeleton width={44} height={44} radius="var(--bs-radius-full)" />
  if (session.status !== 'signed_in' || !session.user) {
    return (
      <div className={css.authBtns}>
        <ButtonLink href={ROUTES.login} variant="ghost" size="md" className="bs-desktop-only">Sign in</ButtonLink>
        <ButtonLink href={ROUTES.partner.apply} variant="primary" size="md" className="bs-desktop-only">Become a partner</ButtonLink>
        <span className="bs-mobile-only"><Link href={ROUTES.login} className={css.navIcon} aria-label="Sign in"><Icon name="user" size={20} /></Link></span>
      </div>
    )
  }
  const user = session.user
  return (
    <Popover
      align="end"
      width={300}
      panelLabel="Account"
      trigger={({ toggle, props }) => (
        <button type="button" className={css.avatarBtn} onClick={toggle} aria-label="Account menu" {...props}>
          <Avatar user={user} />
          <Icon name="chevronDown" size={14} className="bs-desktop-only" />
        </button>
      )}
    >
      {close => <AccountPanel session={session} close={close} />}
    </Popover>
  )
}

// ── Mobile drawer ────────────────────────────────────────────
function DrawerCurrency() {
  const { currency } = useCurrency()
  return (
    <div style={{ display: 'flex', gap: 'var(--bs-space-2)', flexWrap: 'wrap', padding: '0 var(--bs-space-2)' }}>
      {CURRENCIES.map(c => (
        <button key={c} type="button" className={css.navBtn} aria-pressed={c === currency}
          style={c === currency ? { background: 'var(--bs-accent-fill)', color: '#fff' } : { border: '1px solid var(--bs-border-default)' }}
          onClick={() => setCurrency(c)}>{c}</button>
      ))}
    </div>
  )
}

function MobileNav({ open, onClose, session, onSearch }: {
  open: boolean; onClose: () => void; session: SessionState; onSearch: () => void
}) {
  const { products } = useProducts({ enabled: open })
  const cats = useCategories(products)
  const { isDark, toggle, mounted } = useTheme()
  const pathname = usePathname()
  const signedIn = session.status === 'signed_in' && !!session.user

  return (
    <Drawer open={open} onClose={onClose} side="left" label="Menu">
      <div className={css.drawerHead}>
        <Logo />
        <IconButton icon="close" label="Close menu" onClick={onClose} />
      </div>
      <DrawerBody>
        <div className={css.drawerSection}>
          <button type="button" className={css.drawerSearch} onClick={() => { onClose(); onSearch() }}>
            <Icon name="search" size={16} /> Search products
          </button>
        </div>
        {signedIn && (
          <div className={css.drawerSection}>
            <div className={css.acctHead} style={{ padding: 0 }}>
              <Avatar user={session.user!} size={40} />
              <div style={{ minWidth: 0 }}>
                <div className={css.acctName}>{session.user!.full_name || 'Your account'}</div>
                <div className={css.acctEmail}>{session.user!.email}</div>
              </div>
            </div>
          </div>
        )}
        <div className={css.drawerSection}>
          <MenuLabel>Shop</MenuLabel>
          <MenuItem href={ROUTES.shop} icon="store" onClick={onClose}>All products</MenuItem>
          {cats.slice(0, 10).map(c => (
            <MenuItem key={c.key} icon="grid" onClick={() => { onClose(); shop.category(c.key) }}>{categoryLabel(c.key)}</MenuItem>
          ))}
        </div>
        {signedIn ? (
          <div className={css.drawerSection}>
            <MenuLabel>Account</MenuLabel>
            <AccountLinks session={session} close={onClose} />
          </div>
        ) : null}
        <div className={css.drawerSection}>
          <MenuLabel>Earn</MenuLabel>
          <MenuItem href={ROUTES.partner.apply} icon="gift" onClick={onClose}>Partner programme</MenuItem>
          <MenuItem href={ROUTES.loginAs('partner')} icon="users" onClick={onClose}>Partner sign in</MenuItem>
        </div>
        <div className={css.drawerSection}>
          <MenuLabel>Currency</MenuLabel>
          <DrawerCurrency />
        </div>
        <div className={css.drawerSection}>
          <MenuLabel>Support</MenuLabel>
          <MenuItem href={ROUTES.help} icon="help" onClick={onClose}>Help centre</MenuItem>
          <MenuItem href={EXTERNAL.contact} icon="message" external>Contact us</MenuItem>
          {isThemeableRoute(pathname) && (
            <MenuItem icon={mounted && !isDark ? 'moon' : 'sun'} onClick={toggle}>
              {mounted && !isDark ? 'Dark theme' : 'Light theme'}
            </MenuItem>
          )}
        </div>
        <div className={css.drawerSection} style={{ borderBottom: 'none' }}>
          {signedIn
            ? <Button variant="secondary" full icon="logout" onClick={() => { onClose(); signOut() }}>Log out</Button>
            : <div style={{ display: 'grid', gap: 'var(--bs-space-2)' }}>
                <ButtonLink href={ROUTES.login} full>Sign in</ButtonLink>
                <ButtonLink href={ROUTES.signup} variant="secondary" full>Create an account</ButtonLink>
              </div>}
        </div>
      </DrawerBody>
    </Drawer>
  )
}

// ── Currency ─────────────────────────────────────────────────
// Display only: everything is charged in Naira (see lib/currency.ts).
function CurrencyMenu() {
  const { currency } = useCurrency()
  return (
    <Popover
      align="end"
      width={220}
      panelLabel="Currency"
      trigger={({ toggle, props }) => (
        <button type="button" className={css.navBtn} onClick={toggle} aria-label={`Currency: ${currency}`} {...props}>
          {currency}<Icon name="chevronDown" size={14} />
        </button>
      )}
    >
      {close => (
        <>
          <MenuLabel>Show prices in</MenuLabel>
          {CURRENCIES.map(c => (
            <MenuItem key={c} onClick={() => { setCurrency(c); close() }}
              trailing={c === currency ? <Icon name="check" size={14} /> : undefined}>
              {CURRENCY_LABELS[c] || c}
            </MenuItem>
          ))}
          <MenuSeparator />
          <p style={{ padding: '0 var(--bs-space-3) var(--bs-space-2)', fontSize: 'var(--bs-text-2xs)', color: 'var(--bs-text-muted)', lineHeight: 1.4 }}>
            You’re always charged in Naira. Other currencies are estimates.
          </p>
        </>
      )}
    </Popover>
  )
}

// ── Header ───────────────────────────────────────────────────
function isTypingTarget(el: EventTarget | null) {
  const t = el as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}

export default function SiteHeader() {
  const session = useSession()
  const cart = useCart()
  const [mounted, setMounted] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const count = mounted ? cartCount(cart) : 0

  useEffect(() => { setMounted(true) }, [])

  // "/" (when not typing) and ⌘K / Ctrl+K open search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o); return }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) { e.preventDefault(); setPaletteOpen(true) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className={css.header}>
      <a href="#main" className={css.skip}>Skip to content</a>
      <div className={css.bar}>
        <span className="bs-mobile-only">
          <IconButton icon="menu" label="Open menu" onClick={() => setNavOpen(true)} />
        </span>
        <Logo />
        <nav aria-label="Primary" className={`${css.primary} bs-desktop-only`}>
          <BrowseMenu />
        </nav>

        <button type="button" className={`${css.searchBox} bs-desktop-only`} onClick={() => setPaletteOpen(true)} aria-label="Search products">
          <Icon name="search" size={16} />
          <span className={css.searchPlaceholder}>Search Netflix, Spotify, ChatGPT…</span>
          <Kbd>/</Kbd>
        </button>

        <div className={css.actions}>
          <Link href={ROUTES.partner.apply} className={`${css.navBtn} bs-desktop-only`}>
            <Icon name="gift" size={16} /> Earn
          </Link>
          <span className="bs-mobile-only">
            <IconButton icon="search" label="Search" onClick={() => setPaletteOpen(true)} />
          </span>
          <span className="bs-desktop-only"><ThemeToggle /></span>
          <span className="bs-desktop-only"><CurrencyMenu /></span>
          <IconButton icon="cart" label="Cart" count={count} onClick={() => setCartDrawer(true)} />
          <AccountMenu session={session} />
        </div>
      </div>

      <CartDrawer />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} session={session} onSearch={() => setPaletteOpen(true)} />
    </header>
  )
}
