'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Pagination, CommissionBadge, Table, type Column } from '@/components/ui'
import { useApi } from '@/lib/useApi'
import { fmtDate, fmtNGN } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from '@/components/account/AccountShell'
import { CommissionRow } from './PartnerOverview'
import type { Commission } from './usePartner'
import s from '@/components/account/account.module.css'

const PER_PAGE = 20

export default function PartnerConversions() {
  const router = useRouter()
  const page = Math.max(1, Number(useSearchParams().get('page')) || 1)
  const { data, meta, error, loading, reload } = useApi<Commission[]>(`/v2/affiliates/me/commissions?page=${page}&limit=${PER_PAGE}`)
  const pg = meta?.pagination

  const cols: Column<Commission>[] = [
    { key: 'date', header: 'Date', cell: c => <span className={s.secondary}>{fmtDate(c.created_at)}</span> },
    { key: 'order', header: 'Order', cell: c => <span style={{ fontWeight: 600 }}>{c.orders?.order_ref || '-'}</span> },
    { key: 'total', header: 'Order total', align: 'right', cell: c => <span className={s.secondary}>{c.orders?.total_ngn != null ? fmtNGN(c.orders.total_ngn) : '-'}</span> },
    { key: 'amount', header: 'Your commission', align: 'right', cell: c => <span className={s.rowAmount}>{fmtNGN(c.amount_ngn)}</span> },
    { key: 'status', header: 'Status', align: 'right', cell: c => <CommissionBadge status={c.status} /> },
  ]

  return (
    <>
      <PageHead title="Conversions" lede="Orders placed through your links and the commission each earned." />
      <div className={s.panel}>
        {loading ? <RowsSkeleton n={5} />
          : error ? <PanelError message={error} onRetry={reload} />
          : !data?.length ? (
            <PanelEmpty title="No conversions yet">
              Share a <Link href={ROUTES.partner.links} className={s.textLink}>referral link</Link>. When someone orders through it, the order shows here.
            </PanelEmpty>
          ) : (
            <>
              <div className="bs-desktop-only" style={{ padding: '0 var(--bs-space-2)' }}>
                <Table caption="Your conversions" columns={cols} rows={data} rowKey={c => c.id} responsive={false} />
              </div>
              <ul className={`${s.rows} bs-mobile-only`}>{data.map(c => <CommissionRow key={c.id} c={c} />)}</ul>
            </>
          )}
      </div>
      {pg && <Pagination page={pg.page} pages={pg.pages} total={pg.total} size="md" onPage={p => router.push(p > 1 ? `${ROUTES.partner.conversions}?page=${p}` : ROUTES.partner.conversions)} />}
      <p className={s.muted}>Order totals are what the customer paid. Commission is calculated by BuySub at your rate when the order is paid.</p>
    </>
  )
}
