'use client'

// Ported from components/Marketplace.tsx (ProductLogo). Tries logo.dev for the
// product's domain, then its uploaded image, then a lettered tile. The logo.dev
// theme follows the page theme instead of being pinned to dark, and the tile
// colours are fixed dark swatches with a white letter, legible in both themes.

import { useEffect, useState } from 'react'
import { LOGO_DEV_TOKEN } from '@/lib/constants'

const SWATCHES = ['#2D2D5E', '#1A3A4A', '#2E1A3A', '#1A3A2A', '#3A2A1A']

export function cleanDomain(d: string | null | undefined): string {
  return String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
}

function sources(domain: string, image: string | null | undefined, size: number): string[] {
  const list: string[] = []
  const px = Math.min(256, Math.max(64, size * 2))
  if (domain && LOGO_DEV_TOKEN) list.push(`https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=${px}&format=png&retina=true`)
  if (image) list.push(image)
  return list
}

export function ProductLogo({ product, size = 48, radius = 'var(--bs-radius-lg)' }: {
  product: { name?: string | null; domain?: string | null; image_url?: string | null }
  size?: number
  radius?: string
}) {
  const name = String(product.name || '?')
  const domain = cleanDomain(product.domain)
  const [list, setList] = useState(() => sources(domain, product.image_url, size))
  const [idx, setIdx] = useState(0)

  useEffect(() => { setList(sources(domain, product.image_url, size)); setIdx(0) }, [domain, product.image_url, size])

  const src = list[idx]
  if (src) {
    return (
      <span style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden', display: 'block', background: '#fff', border: '1px solid var(--bs-border-default)' }}>
        <img key={src} src={src} alt="" loading="lazy" onError={() => setIdx(i => i + 1)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </span>
    )
  }
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: SWATCHES[name.charCodeAt(0) % SWATCHES.length],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#fff',
    }}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
