// ============================================================
// Shop Ad Components — Banner, Sidebar, Sponsored Product Card
// File: ~/Downloads/buysub-web/components/ShopAds.tsx
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

import { useState, useEffect, useCallback } from 'react'

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

// ════════════════════════════════════════════════════════════
// BANNER AD — full-width at top of shop
// ════════════════════════════════════════════════════════════

export function ShopBanner({ ads }: { ads: Ad[] }) {
  const [current, setCurrent] = useState(0)

  // Auto-rotate every 6 seconds if multiple
  useEffect(() => {
    if (ads.length <= 1) return
    const interval = setInterval(() => {
      setCurrent(c => (c + 1) % ads.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [ads.length])

  if (ads.length === 0) return null

  const ad = ads[current]

  return (
    <div style={{ marginBottom: 16 }}>
      <a
        href={ad.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick(ad.id)}
        style={{ display: 'block', textDecoration: 'none' }}
      >
        <div style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--bs-border-subtle, #1c1c22)',
        }}>
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
          {/* "Ad" label */}
          <span style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(0,0,0,0.6)',
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            Ad
          </span>
        </div>
      </a>
      {/* Dots indicator for multiple banners */}
      {ads.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
          {ads.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === current ? '#7C5CFF' : 'var(--bs-border-default, #27272e)',
              border: 'none', cursor: 'pointer', padding: 0,
            }} />
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
      gap: 12,
      width: 200,
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: 9,
        color: 'var(--bs-text-faint, #4a4a5e)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        paddingLeft: 2,
      }}>
        Sponsored
      </div>
      {ads.map(ad => (
        <a
          key={ad.id}
          href={ad.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(ad.id)}
          style={{ textDecoration: 'none' }}
        >
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid var(--bs-border-subtle, #1c1c22)',
            background: 'var(--bs-bg-card, #111114)',
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#7C5CFF')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bs-border-subtle, #1c1c22)')}
          >
            <img
              src={ad.image_url}
              alt={ad.title}
              style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 12, color: 'var(--bs-text-primary, #e8e8ec)', lineHeight: 1.4 }}>
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
    <a
      href={ad.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackClick(ad.id)}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          ...cardStyle,
          border: '1px solid var(--bs-border-subtle, #1c1c22)',
          position: 'relative',
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = '#7C5CFF40')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bs-border-subtle, #1c1c22)')}
      >
        {/* Sponsored badge — top right */}
        <span style={{
          position: 'absolute',
          top: isMobile ? 10 : 14,
          right: isMobile ? 10 : 14,
          fontSize: 9,
          padding: '2px 7px',
          borderRadius: 4,
          background: '#7C5CFF20',
          color: '#7C5CFF',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}>
          {ad.card_badge || 'Sponsored'}
        </span>

        {/* Top section — logo + name */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Ad image as logo */}
            <div style={{
              width: isMobile ? 36 : 44,
              height: isMobile ? 36 : 44,
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--bs-bg-elevated, #18181c)',
            }}>
              <img
                src={ad.image_url}
                alt={ad.card_name || ad.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <div style={{
                fontSize: isMobile ? 14 : 16,
                color: 'var(--bs-text-primary, #e8e8ec)',
                fontWeight: 500,
                lineHeight: 1.3,
              }}>
                {ad.card_name || ad.title}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--bs-text-muted, #6b6b7e)',
                marginTop: 2,
              }}>
                {ad.card_category || 'Sponsored'}
              </div>
            </div>
          </div>

          {/* Description (use title as fallback) */}
          <div style={{
            fontSize: 12,
            color: 'var(--bs-text-secondary, #a0a0b0)',
            lineHeight: 1.5,
          }}>
            {ad.title}
          </div>
        </div>

        {/* Bottom section — price + CTA */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: isMobile ? 10 : 14,
        }}>
          <div>
            {ad.card_price && (
              <div style={{
                fontSize: isMobile ? 16 : 18,
                fontWeight: 600,
                color: 'var(--bs-text-primary, #e8e8ec)',
              }}>
                {ad.card_price}
              </div>
            )}
          </div>
          <div style={{
            fontSize: 12,
            padding: '6px 14px',
            borderRadius: 8,
            background: '#7C5CFF20',
            color: '#7C5CFF',
            fontWeight: 500,
          }}>
            Learn More
          </div>
        </div>
      </div>
    </a>
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
      padding: '8px 14px',
      background: '#7C5CFF12',
      border: '1px solid #7C5CFF30',
      borderRadius: 10,
      marginBottom: 14,
      fontSize: 12,
      color: 'var(--bs-text-secondary, #a0a0b0)',
      flexWrap: 'wrap',
      gap: 8,
    }}>
      <span>
        Shopping via <strong style={{ color: '#7C5CFF' }}>{storeName || referralCode}</strong>'s referral link
      </span>
      <button
        onClick={onClear}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--bs-text-faint, #4a4a5e)',
          cursor: 'pointer',
          fontSize: 11,
          padding: '2px 6px',
        }}
      >
        ✕ Remove
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