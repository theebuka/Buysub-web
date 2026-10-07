'use client'

// /admin/reviews: every product review. Hide one to take it off the product
// page (the customer is told theirs is hidden); publish to bring it back.
// Only customers with a paid order for the product can post.

import Link from 'next/link'
import { toast } from 'sonner'
import { Badge, Button } from '@/components/ui'
import { DataTable, Filters, SearchBox, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, adminStyles as s } from '@/components/admin/AdminUI'
import { Stars } from '@/components/shop/Reviews'
import { authFetch } from '@/lib/apiAuth'
import { fmtDate } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'

type Review = {
  id: string; rating: number; body: string | null; display_name: string | null; status: 'published' | 'hidden'
  created_at: string; product_id: string
  products?: { name: string; slug: string } | null
  orders?: { order_ref: string } | null
}

export function ReviewsTab() {
  const list = useAdminList<Review>('/v2/admin/reviews', { params: ['status', 'rating'], limit: 25 })
  const status = list.params.status || ''
  const rating = list.params.rating || ''

  const setStatus = async (r: Review, next: Review['status']) => {
    const res = await authFetch(`/v2/admin/reviews/${r.id}`, { method: 'PATCH', body: { status: next } })
    if (!res.ok) { toast.error(res.error || 'That didn’t work'); return }
    list.patchRow(x => x.id === r.id, { status: next })
    toast.success(next === 'hidden' ? 'Review hidden' : 'Review published')
  }

  const columns: DTColumn<Review>[] = [
    { key: 'rating', header: 'Rating', cell: r => <Stars value={r.rating} size={13} /> },
    {
      key: 'review', header: 'Review', cell: r => (
        <div className={s.wrapCell} style={{ maxWidth: 440 }}>
          {r.body ? <span>{r.body}</span> : <span className={s.secondary}>No written review</span>}
          <div className={s.secondary} style={{ marginTop: 2 }}>{r.display_name || 'Customer'}{r.orders?.order_ref ? <> · <Link href={`/admin/orders/${encodeURIComponent(r.orders.order_ref)}`} className={s.link}>{r.orders.order_ref}</Link></> : null}</div>
        </div>
      ),
    },
    { key: 'product', header: 'Product', cell: r => r.products ? <Link href={`/shop/${encodeURIComponent(r.products.slug)}#reviews`} className={s.link} target="_blank">{r.products.name}</Link> : '-' },
    { key: 'date', header: 'Posted', cell: r => <span className={s.secondary}>{fmtDate(r.created_at)}</span> },
    { key: 'status', header: 'Status', cell: r => <Badge tone={r.status === 'published' ? 'success' : 'neutral'}>{r.status === 'published' ? 'Published' : 'Hidden'}</Badge> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
      cell: r => r.status === 'published'
        ? <Button size="sm" variant="secondary" onClick={() => setStatus(r, 'hidden')}>Hide</Button>
        : <Button size="sm" variant="secondary" onClick={() => setStatus(r, 'published')}>Publish</Button>,
    },
  ]

  return (
    <>
      <AdminHead title="Reviews" lede="What buyers say on product pages. Hide anything abusive or off-topic." />
      <DataTable
        caption="Reviews"
        columns={columns}
        rows={list.rows}
        rowKey={r => r.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        pagination={list.pagination}
        onPage={p => list.setParams({ page: String(p) })}
        toolbar={<>
          <SearchBox value={list.params.q || ''} onChange={q => list.setParams({ q })} placeholder="Search review text or name" />
          <Filters label="Status" value={status} onChange={v => list.setParams({ status: v })} options={[
            { value: '', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'hidden', label: 'Hidden' },
          ]} />
          <Filters label="Rating" value={rating} onChange={v => list.setParams({ rating: v })} options={[
            { value: '', label: 'Any rating' }, ...[5, 4, 3, 2, 1].map(n => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` })),
          ]} />
        </>}
        empty={<TableState title={status || rating || list.params.q ? 'No reviews match' : 'No reviews yet'}>Reviews appear here once customers start rating what they bought.</TableState>}
      />
    </>
  )
}
