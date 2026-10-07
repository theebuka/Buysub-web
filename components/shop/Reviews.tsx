'use client'

// Ratings and reviews (buysub-api-deploy/src/features/reviews.ts).
// Stars are neutral ink, not gold: they sit next to prices and badges that
// already carry colour, and the shop keeps colour for status and actions.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Field, Skeleton, Textarea } from '@/components/ui'
import { API_BASE } from '@/lib/config'
import { authFetch } from '@/lib/apiAuth'
import { useSession } from '@/lib/useSession'
import { useSiteStatus } from '@/lib/siteStatus'
import { fmtDate } from '@/lib/format'
import type { Product } from '@/lib/constants'
import s from './shop.module.css'

const STAR = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  const row = (fill: boolean) => (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
          fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={fill ? 0 : 1.6} strokeLinejoin="round">
          <path d={STAR} />
        </svg>
      ))}
    </span>
  )
  return (
    <span className={s.stars} role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      <span className={s.starsEmpty}>{row(false)}</span>
      <span className={s.starsFill} style={{ width: `${pct}%` }}>{row(true)}</span>
    </span>
  )
}

const compact = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n)

/** "★ 4.7 (86) · 1.2k sold" under a product name. Renders nothing without data. */
export function RatingLine({ product: p, size = 12 }: { product: Product; size?: number }) {
  const rated = (p.rating_count ?? 0) > 0 && p.rating_avg != null
  const sold = p.sold_count ?? 0
  if (!rated && !sold) return null
  return (
    <span className={s.ratingLine}>
      {rated && <><Stars value={Number(p.rating_avg)} size={size} /><span>{Number(p.rating_avg).toFixed(1)} ({compact(p.rating_count!)})</span></>}
      {rated && sold > 0 && <span aria-hidden="true">·</span>}
      {sold > 0 && <span>{compact(sold)} sold</span>}
    </span>
  )
}

type Review = { id: string; rating: number; body: string | null; display_name: string | null; created_at: string }
type Summary = { average: number | null; count: number; distribution: number[] }

function Distribution({ summary }: { summary: Summary }) {
  const max = Math.max(1, ...summary.distribution)
  return (
    <div className={s.dist}>
      {[5, 4, 3, 2, 1].map(n => (
        <div key={n} className={s.distRow}>
          <span>{n}</span>
          <span className={s.distBar}><span style={{ width: `${(summary.distribution[n - 1] / max) * 100}%` }} /></span>
          <span className={s.distCount}>{summary.distribution[n - 1]}</span>
        </div>
      ))}
    </div>
  )
}

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div role="radiogroup" aria-label="Your rating" className={s.starInput} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}>
          <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden="true" fill={n <= shown ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round"><path d={STAR} /></svg>
        </button>
      ))}
    </div>
  )
}

type Mine = { enabled: boolean; can_review: boolean; review: { rating: number; body: string | null; status: string } | null }

function ReviewForm({ product, onSaved }: { product: Product; onSaved: () => void }) {
  const session = useSession()
  const [mine, setMine] = useState<Mine | null>(null)
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (session.status !== 'signed_in') return
    authFetch<Mine>(`/v2/me/reviews/${encodeURIComponent(product.id)}`, { redirectOnAuth: false }).then(r => {
      if (!r.ok || !r.data) return
      setMine(r.data)
      if (r.data.review) { setRating(r.data.review.rating); setBody(r.data.review.body || '') }
    })
  }, [session.status, product.id])

  if (session.status === 'signed_out') {
    return <p className={s.muted}>Bought this? <Link className={s.inlineLink} href={`/login?next=${encodeURIComponent(`/shop/${product.slug}#reviews`)}`}>Sign in</Link> to review it.</p>
  }
  if (!mine?.enabled || !mine.can_review) return null

  const save = async () => {
    if (!rating) { toast.error('Choose a star rating'); return }
    setBusy(true)
    const r = await authFetch('/v2/me/reviews', { method: 'POST', body: { product_id: product.id, rating, body }, redirectOnAuth: false })
    setBusy(false)
    if (!r.ok) { toast.error(r.error || 'Couldn’t save your review'); return }
    toast.success(mine.review ? 'Review updated' : 'Thanks for your review')
    setMine({ ...mine, review: { rating, body, status: (r.data as any)?.status || 'published' } })
    setOpen(false)
    onSaved()
  }

  if (!open) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bs-space-3)', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="md" icon="star" onClick={() => setOpen(true)}>{mine.review ? 'Edit your review' : 'Write a review'}</Button>
        {mine.review?.status === 'hidden' && <span className={s.muted}>Your review is hidden by our team.</span>}
      </div>
    )
  }
  return (
    <div className={s.reviewForm}>
      <StarInput value={rating} onChange={setRating} />
      <Field label="Your review (optional)">
        {p => <Textarea {...p} rows={4} maxLength={2000} value={body}
          placeholder="How was delivery, and does it work as described?" onChange={e => setBody(e.target.value)} />}
      </Field>
      <div style={{ display: 'flex', gap: 'var(--bs-space-2)' }}>
        <Button size="md" loading={busy} onClick={save}>{mine.review ? 'Save changes' : 'Post review'}</Button>
        <Button size="md" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      <p className={s.muted}>Shown with your first name and last initial.</p>
    </div>
  )
}

export function ReviewsSection({ product }: { product: Product }) {
  const status = useSiteStatus()
  const [items, setItems] = useState<Review[] | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!status.services.reviews) return
    let live = true
    fetch(`${API_BASE}/v2/products/${encodeURIComponent(product.slug)}/reviews?page=${page}&limit=5`)
      .then(r => r.json())
      .then(j => {
        if (!live || !j?.ok || !j.data?.enabled) { if (live) setItems([]); return }
        setSummary(j.data.summary)
        setItems(prev => page === 1 ? j.data.items : [...(prev || []), ...j.data.items])
        setPages(j.meta?.pagination?.pages || 1)
      })
      .catch(() => { if (live) setItems([]) })
    return () => { live = false }
  }, [product.slug, page, tick, status.services.reviews])

  if (!status.services.reviews) return null
  const count = summary?.count ?? 0

  return (
    <section className={s.section} id="reviews" style={{ scrollMarginTop: 'calc(var(--bs-header-h) + 16px)' }}>
      <h2 className={s.sectionTitle}>Reviews{count ? ` (${count})` : ''}</h2>
      {items === null ? <Skeleton height={80} /> : (
        <>
          {count > 0 && summary?.average != null && (
            <div className={s.reviewSummary}>
              <div>
                <div className={s.reviewAvg}>{summary.average.toFixed(1)}</div>
                <Stars value={summary.average} size={16} />
                <div className={s.muted} style={{ marginTop: 4 }}>{count} review{count === 1 ? '' : 's'}</div>
              </div>
              <Distribution summary={summary} />
            </div>
          )}
          <ReviewForm product={product} onSaved={() => { setPage(1); setTick(t => t + 1) }} />
          {count === 0 ? <p className={s.prose}>No reviews yet. Customers who buy {product.name} can leave one here.</p> : (
            <ul className={s.reviewList}>
              {items.map(r => (
                <li key={r.id}>
                  <div className={s.reviewHead}>
                    <Stars value={r.rating} />
                    <span className={s.reviewName}>{r.display_name || 'BuySub customer'}</span>
                    <span className={s.muted}>{fmtDate(r.created_at)} · Verified purchase</span>
                  </div>
                  {r.body && <p className={s.prose}>{r.body}</p>}
                </li>
              ))}
            </ul>
          )}
          {page < pages && <div><Button variant="ghost" size="md" onClick={() => setPage(p => p + 1)}>Show more reviews</Button></div>}
        </>
      )}
    </section>
  )
}
