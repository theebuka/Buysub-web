// ============================================================
// Shop Ad Components — Banner, Sidebar, Sponsored Product Card
//
// Usage in shop page:
//   import { ShopBanner, ShopSidebar, SponsoredProductCard } from '@/components/ShopAds'
//
//   // Banner at top of shop:
//   <ShopBanner />
//
//   // Sidebar (desktop only, beside the product grid):
//   <ShopSidebar />
//
//   // Sponsored cards mixed into grid (call useShopAds hook):
//   const { sponsoredCards } = useShopAds()
//   // Then interleave sponsoredCards into your product array
// ============================================================

'use client'

import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'

interface Ad {
  id: string
  title: string
  image_url: string
  link: string
  placement: string
  ad_type: string
  card_name: string | null
  card_category: string | null
  card_price: string | null
  card_badge: string | null
  weight: number
}

// Hover and focus states, which inline styles cannot express. Replaces the
// onMouseEnter/onMouseLeave handlers that used to mutate style.borderColor
// directly — those gave a pointer user a hover state and a keyboard user
// nothing at all. Focus lands on the <a>, so the border rules are descendant
// selectors on the box inside it.
const AD_CSS = `
.bs-ad-link:focus-visible { outline: none; box-shadow: var(--bs-ring); border-radius: var(--bs-radius-md); }
.bs-ad-link:hover .bs-ad-frame,
.bs-ad-link:focus-visible .bs-ad-frame { border-color: var(--bs-accent); }
.bs-ad-dot:focus-visible,
.bs-ad-btn:focus-visible { outline: none; box-shadow: var(--bs-ring); }
.bs-ad-dot:hover .bs-ad-dot-mark { background: var(--bs-accent); }
.bs-ad-btn:hover { color: var(--bs-text-primary); }
`

function AdStyles() {
  return <style dangerouslySetInnerHTML={{ __html: AD_CSS }} />
}

// Inline SVG, 24x24 viewBox, currentColor, strokeWidth 2, round caps — the
// house pattern (Marketplace's CartIcon, Phases 1-5, the receipt form's XIcon
// in Phase 10). Replaces the ✕ glyph, per the non-ASCII rule.
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/**
 * The global prefers-reduced-motion block in CSS_VARS collapses CSS animation
 * and transition, but it cannot stop a JS timer — and the banner rotation is a
 * setInterval. This is the only JS-driven animation in the repo, so the hook
 * stays local rather than being lifted into lib/theme.ts for one caller.
 *
 * Same shape as the viewport listeners in app/login/page.tsx:360 and
 * app/dashboard/page.tsx:368, so a preference changed mid-session is honoured
 * rather than only being read once at mount.
 */
function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduce(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduce
}

// ── Hook to fetch ads for all placements ──
export function useShopAds() {
  const [bannerAds, setBannerAds] = useState<Ad[]>([])
  const [sidebarAds, setSidebarAds] = useState<Ad[]>([])
  const [sponsoredCards, setSponsoredCards] = useState<Ad[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [bannerRes, sidebarRes, cardRes] = await Promise.all([
          fetch(`${API}/v2/ads?placement=shop_banner&limit=3`).then(r => r.json()),
          fetch(`${API}/v2/ads?placement=shop_sidebar&limit=4`).then(r => r.json()),
          fetch(`${API}/v2/ads?placement=shop_product_card&limit=6`).then(r => r.json()),
        ])

        if (bannerRes.ok) setBannerAds(bannerRes.data || [])
        if (sidebarRes.ok) setSidebarAds(sidebarRes.data || [])
        if (cardRes.ok) setSponsoredCards(cardRes.data || [])

        // Track impressions for all loaded ads
        const allIds = [
          ...(bannerRes.data || []).map((a: Ad) => a.id),
          ...(sidebarRes.data || []).map((a: Ad) => a.id),
          ...(cardRes.data || []).map((a: Ad) => a.id),
        ]
        if (allIds.length > 0) {
          fetch(`${API}/v2/ads/impression`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ad_ids: allIds }),
          }).catch(() => {})
        }
      } catch {
        // Ads are non-critical — fail silently
      }
      setLoaded(true)
    }
    fetchAll()
  }, [])

  return { bannerAds, sidebarAds, sponsoredCards, loaded }
}

// ── Track ad click ──
const trackClick = (adId: string) => {
  fetch(`${API}/v2/ads/click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ad_id: adId }),
  }).catch(() => {})
}

// The disclosure label shared by the banner and the sponsored card. Kept
// uppercase and tracked, a deliberate exception to the sentence-case
// convention Phases 1-5 applied to customer surfaces: this is an advertising
// disclosure, where a conventional and visually distinct label is the function
// rather than decoration. Same standing as admin's micro-labels — do not
// "fix" it in a later pass.
const DISCLOSURE: React.CSSProperties = {
  fontSize: 'var(--bs-text-2xs)',
  padding: 'var(--bs-space-1) var(--bs-space-2)',
  borderRadius: 'var(--bs-radius-sm)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

// ════════════════════════════════════════════════════════════
// BANNER AD — full-width at top of shop
// ════════════════════════════════════════════════════════════

export function ShopBanner({ ads }: { ads: Ad[] }) {
  const [current, setCurrent] = useState(0)
  const [tookControl, setTookControl] = useState(false)
  const [engaged, setEngaged] = useState(false)
  const reduceMotion = usePrefersReducedMotion()

  /**
   * Auto-rotate every 6 seconds if multiple.
   *
   * Three things stop the timer, and they answer two different requirements:
   *
   * - `reduceMotion` — the global CSS block cannot reach a JS timer, so the
   *   guard has to live here.
   * - `tookControl` / `engaged` — WCAG 2.2.2. Content that auto-updates for
   *   longer than 5 seconds alongside other content needs a mechanism to
   *   pause, stop or hide it, and reduced motion does not discharge that: it
   *   only covers users who set the OS preference. Choosing a slide cancels
   *   rotation for good (the user has taken manual control); hovering or
   *   focusing the banner pauses it while they are engaged with it.
   */
  useEffect(() => {
    if (ads.length <= 1) return
    if (reduceMotion || tookControl || engaged) return
    const interval = setInterval(() => {
      setCurrent(c => (c + 1) % ads.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [ads.length, reduceMotion, tookControl, engaged])

  if (ads.length === 0) return null

  const ad = ads[current]

  return (
    <div
      style={{ marginBottom: 'var(--bs-space-4)' }}
      onMouseEnter={() => setEngaged(true)}
      onMouseLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
    >
      <AdStyles />
      <a
        className="bs-ad-link"
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick(ad.id)}
        style={{ display: 'block', textDecoration: 'none' }}
      >
        <div
          className="bs-ad-frame"
          style={{
            position: 'relative',
            // Nearest step would be radius-lg, but this sits directly above a
            // grid of 20/28-radius cards and would read as sharper-cornered
            // than everything below it.
            borderRadius: 'var(--bs-radius-xl)',
            overflow: 'hidden',
            border: '1px solid var(--bs-border-subtle)',
            transition: 'border-color var(--bs-dur-1) var(--bs-ease-out)',
          }}
        >
          <img
            src={ad.image_url}
            alt={ad.title}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: 180,
              objectFit: 'cover',
              display: 'block',
            }}
          />
          {/* Disclosure label. Was #888 on a rgba(0,0,0,0.6) scrim, so its
              contrast depended entirely on the image underneath — over a pale
              image the composite lands near 1.9:1. An opaque fill cannot
              composite with what sits beneath it, which is the same reasoning
              Phase 6 used to make the admin badges opaque. */}
          <span style={{
            ...DISCLOSURE,
            position: 'absolute',
            top: 'var(--bs-space-2)',
            right: 'var(--bs-space-2)',
            background: 'var(--bs-bg-card)',
            color: 'var(--bs-text-secondary)',
          }}>
            Ad
          </span>
        </div>
      </a>

      {/* Slide picker. Also the WCAG 2.2.2 stop mechanism — see the effect. */}
      {ads.length > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'var(--bs-space-1)',
          marginTop: 'var(--bs-space-2)',
        }}>
          {ads.map((_, i) => (
            <button
              key={i}
              type="button"
              className="bs-ad-dot"
              aria-label={`Show ad ${i + 1} of ${ads.length}`}
              aria-current={i === current}
              onClick={() => { setCurrent(i); setTookControl(true) }}
              style={{
                // The visible dot stays small; the button carries the 44px
                // target. It was 6x6 — the whole control, on a mobile-first
                // surface — with no accessible name at all.
                width: 'var(--bs-control-lg)',
                height: 'var(--bs-control-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--bs-radius-full)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span
                className="bs-ad-dot-mark"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 'var(--bs-radius-full)',
                  background: i === current ? 'var(--bs-accent)' : 'var(--bs-border-strong)',
                  transition: 'background var(--bs-dur-1) var(--bs-ease-out)',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SIDEBAR ADS — vertical stack beside product grid (desktop)
// ════════════════════════════════════════════════════════════

export function ShopSidebar({ ads }: { ads: Ad[] }) {
  if (ads.length === 0) return null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--bs-space-3)',
      // Never reaches mobile: Marketplace.tsx:1151 gates this on !isMobile.
      width: 200,
      flexShrink: 0,
    }}>
      <AdStyles />
      {/* Was --bs-text-faint, which is documented as decorative and disabled
          use only, never for text a user has to read. A disclosure is exactly
          text a user has to read. */}
      <div style={{
        fontSize: 'var(--bs-text-2xs)',
        color: 'var(--bs-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Sponsored
      </div>
      {ads.map(ad => (
        <a
          key={ad.id}
          className="bs-ad-link"
          href={ad.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(ad.id)}
          style={{ textDecoration: 'none' }}
        >
          <div
            className="bs-ad-frame"
            style={{
              // Tie-down would give radius-md, but lg is the documented
              // panel / logo-tile / line-item step, which is what these are.
              borderRadius: 'var(--bs-radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--bs-border-subtle)',
              background: 'var(--bs-bg-card)',
              transition: 'border-color var(--bs-dur-1) var(--bs-ease-out)',
            }}
          >
            <img
              src={ad.image_url}
              alt={ad.title}
              style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: 'var(--bs-space-2) var(--bs-space-3)' }}>
              <div style={{
                fontSize: 'var(--bs-text-xs)',
                color: 'var(--bs-text-primary)',
                lineHeight: 'var(--bs-leading-snug)',
              }}>
                {ad.title}
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// SPONSORED PRODUCT CARD — looks like a regular product card
// ════════════════════════════════════════════════════════════

export function SponsoredProductCard({
  ad,
  isMobile,
  cardStyle,
}: {
  ad: Ad
  isMobile: boolean
  cardStyle: React.CSSProperties
}) {
  return (
    <>
      <AdStyles />
      <a
        className="bs-ad-link"
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick(ad.id)}
        // The <a> is the grid item, so it stretches to the row height, but its
        // child had auto height and stopped short — the sponsored card sat
        // visibly shorter than the real cards beside it. Both need to fill.
        style={{ textDecoration: 'none', display: 'block', height: '100%' }}
      >
      <div
        className="bs-ad-frame"
        style={{
          ...cardStyle,
          // One value off the real product cards beside it, which use a
          // hardcoded #1C1C1F. Matching that would re-introduce the
          // Marketplace leak Phases 7 and 8 removed elsewhere, so this stays
          // on the token and the divergence is logged for the Marketplace
          // phase instead. See REFACTOR.md.
          border: '1px solid var(--bs-border-subtle)',
          position: 'relative',
          cursor: 'pointer',
          height: '100%',
          transition: 'border-color var(--bs-dur-1) var(--bs-ease-out)',
        }}
      >
        {/* Sponsored badge — top right. Accent text on a 12% tint of the same
            accent, which is the on-tint contrast bug Phase 6 first measured at
            3.74:1. */}
        <span style={{
          ...DISCLOSURE,
          position: 'absolute',
          top: isMobile ? 'var(--bs-space-2)' : 'var(--bs-space-3)',
          right: isMobile ? 'var(--bs-space-2)' : 'var(--bs-space-3)',
          background: 'rgba(var(--bs-accent-rgb), 0.12)',
          color: 'color-mix(in srgb, var(--bs-accent), var(--bs-on-tint-mix))',
          fontWeight: 'var(--bs-weight-semibold)',
        }}>
          {ad.card_badge || 'Sponsored'}
        </span>

        {/* Top section — logo + name */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? 'var(--bs-space-2)' : 'var(--bs-space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bs-space-3)' }}>
            {/* Ad image as logo. 36/44 is a layout dimension and stays, as
                logo tiles did in Phase 7. */}
            <div style={{
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              borderRadius: 'var(--bs-radius-md)',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--bs-bg-elevated)',
            }}>
              <img
                src={ad.image_url}
                alt={ad.card_name || ad.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <div style={{
                fontSize: 'var(--bs-text-base)',
                color: 'var(--bs-text-primary)',
                // Was 500. The real product card beside it is 600, and this
                // component's whole job is to match it.
                fontWeight: 'var(--bs-weight-semibold)',
                lineHeight: 'var(--bs-leading-tight)',
              }}>
                {ad.card_name || ad.title}
              </div>
              <div style={{
                fontSize: 'var(--bs-text-2xs)',
                color: 'var(--bs-text-muted)',
                marginTop: 2,
              }}>
                {ad.card_category || 'Sponsored'}
              </div>
            </div>
          </div>

          {/* Description (use title as fallback) */}
          <div style={{
            fontSize: 'var(--bs-text-xs)',
            color: 'var(--bs-text-secondary)',
            lineHeight: 'var(--bs-leading-relaxed)',
          }}>
            {ad.title}
          </div>
        </div>

        {/* Bottom section — price + CTA */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: isMobile ? 'var(--bs-space-2)' : 'var(--bs-space-3)',
        }}>
          <div>
            {ad.card_price && (
              <div style={{
                fontSize: isMobile ? 'var(--bs-text-base)' : 'var(--bs-text-lg)',
                // Phase 0 reserves 700 for prices; this was 600.
                fontWeight: 'var(--bs-weight-bold)',
                color: 'var(--bs-text-primary)',
              }}>
                {ad.card_price}
              </div>
            )}
          </div>
          <div style={{
            fontSize: 'var(--bs-text-xs)',
            padding: 'var(--bs-space-2) var(--bs-space-3)',
            borderRadius: 'var(--bs-radius-sm)',
            background: 'rgba(var(--bs-accent-rgb), 0.12)',
            color: 'color-mix(in srgb, var(--bs-accent), var(--bs-on-tint-mix))',
            fontWeight: 'var(--bs-weight-medium)',
          }}>
            Learn More
          </div>
        </div>
      </div>
      </a>
    </>
  )
}

// ════════════════════════════════════════════════════════════
// REFERRAL BANNER — shown when user arrived via referral link
// ════════════════════════════════════════════════════════════

export function ReferralBanner({
  storeName,
  referralCode,
  onClear,
}: {
  storeName: string
  referralCode: string
  onClear: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--bs-space-2) var(--bs-space-3)',
      background: 'rgba(var(--bs-accent-rgb), 0.12)',
      border: '1px solid rgba(var(--bs-accent-rgb), 0.30)',
      borderRadius: 'var(--bs-radius-md)',
      marginBottom: 'var(--bs-space-3)',
      fontSize: 'var(--bs-text-xs)',
      color: 'var(--bs-text-secondary)',
      flexWrap: 'wrap',
      gap: 'var(--bs-space-2)',
    }}>
      <AdStyles />
      <span>
        Shopping via{' '}
        {/* Accent on a 12% tint of itself — the same on-tint bug as the badge
            and the Learn More chip. */}
        <strong style={{ color: 'color-mix(in srgb, var(--bs-accent), var(--bs-on-tint-mix))' }}>
          {storeName || referralCode}
        </strong>
        's referral link
      </span>
      <button
        type="button"
        onClick={onClear}
        className="bs-ad-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--bs-space-1)',
          height: 'var(--bs-control-lg)',
          padding: '0 var(--bs-space-2)',
          background: 'transparent',
          border: 'none',
          borderRadius: 'var(--bs-radius-md)',
          // Was --bs-text-faint, decorative-and-disabled only.
          color: 'var(--bs-text-muted)',
          cursor: 'pointer',
          fontSize: 'var(--bs-text-2xs)',
        }}
      >
        <XIcon />
        Remove
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// HELPER: Interleave sponsored cards into product grid
// ════════════════════════════════════════════════════════════

/**
 * Inserts sponsored product cards at regular intervals into the product array.
 * Returns a new array with objects marked as { _isAd: true, ad: Ad }
 * so the rendering loop can distinguish real products from ads.
 *
 * Usage:
 *   const merged = interleaveAds(visibleProducts, sponsoredCards, 8)
 *   merged.map(item => {
 *     if (item._isAd) return <SponsoredProductCard ad={item.ad} ... />
 *     return <ProductCard product={item} ... />
 *   })
 */
export function interleaveAds(
  products: any[],
  ads: Ad[],
  interval: number = 8, // insert an ad every N products
): any[] {
  if (ads.length === 0) return products

  const result: any[] = []
  let adIndex = 0

  for (let i = 0; i < products.length; i++) {
    result.push(products[i])

    // After every `interval` products, insert an ad
    if ((i + 1) % interval === 0 && adIndex < ads.length) {
      result.push({ _isAd: true, ad: ads[adIndex] })
      adIndex++
    }
  }

  return result
}
