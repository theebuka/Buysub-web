'use client'

// 30 days of referral clicks. One series on one axis: orders and earnings
// are a different scale, so they live in the hover tooltip and the hidden
// table rather than as a second axis. Thin bars, a 2px gap, rounded tops on
// the baseline, a faint top gridline labelled with the max, accent fill only.

import { useState } from 'react'
import { fmtNGN } from '@/lib/format'
import type { DailyPoint } from './usePartner'
import c from './chart.module.css'

const H = 120

function niceMax(n: number) {
  if (n <= 5) return 5
  const p = Math.pow(10, Math.floor(Math.log10(n)))
  return Math.ceil(n / p) * p
}

const day = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export function ClicksChart({ data }: { data: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(0, ...data.map(d => d.clicks)))
  const h = hover !== null ? data[hover] : null

  return (
    <figure className={c.fig}>
      <div className={c.plot} onMouseLeave={() => setHover(null)}>
        <span className={c.yMax}>{max.toLocaleString('en-NG')}</span>
        <div className={c.grid} aria-hidden="true" />
        <div className={c.bars} style={{ height: H }}>
          {data.map((d, i) => (
            <button
              key={d.date}
              type="button"
              className={c.hit}
              aria-label={`${day(d.date)}: ${d.clicks} clicks, ${d.conversions} orders`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <span className={`${c.bar} ${hover === i ? c.barOn : ''}`} style={{ height: d.clicks ? Math.max(2, (d.clicks / max) * H) : 0 }} />
            </button>
          ))}
        </div>
        {h && (
          <div className={c.tip} role="status" style={{ left: `${((hover! + 0.5) / data.length) * 100}%` }}>
            <div className={c.tipDate}>{day(h.date)}</div>
            <div className={c.tipRow}><span>Clicks</span><b>{h.clicks.toLocaleString('en-NG')}</b></div>
            <div className={c.tipRow}><span>Orders</span><b>{h.conversions}</b></div>
            {h.earned_ngn > 0 && <div className={c.tipRow}><span>Commission</span><b>{fmtNGN(h.earned_ngn)}</b></div>}
          </div>
        )}
      </div>
      <div className={c.xAxis} aria-hidden="true">
        <span>{day(data[0].date)}</span>
        <span>{day(data[data.length - 1].date)}</span>
      </div>
      <table className="sr-only">
        <caption>Referral clicks per day, last 30 days</caption>
        <thead><tr><th>Date</th><th>Clicks</th><th>Orders</th></tr></thead>
        <tbody>{data.map(d => <tr key={d.date}><td>{day(d.date)}</td><td>{d.clicks}</td><td>{d.conversions}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
