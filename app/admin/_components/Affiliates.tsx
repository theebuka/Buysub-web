'use client'

// /admin/affiliates: referral codes and commission rates. Approving sets the
// rate; suspending stops the code earning.

import { useState } from 'react'
import { toast } from 'sonner'
import { Button, StatusBadge } from '@/components/ui'
import { DataTable, Filters, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { authFetch } from '@/lib/apiAuth'
import { fmtDate } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'

type Affiliate = {
  id: string; status: string; business_name?: string; store_name?: string; referral_code: string
  commission_rate: number; click_count?: number; created_at: string
  profiles?: { display_name?: string; email?: string } | null
}

export function AffiliatesTab() {
  const list = useAdminList<Affiliate>('/v2/admin/affiliates', { params: ['status'], limit: 25 })
  const [dialog, setDialog] = useState<{ kind: 'approve' | 'suspend'; a: Affiliate } | null>(null)
  const status = list.params.status || ''

  const act = async (text: string) => {
    if (!dialog) return
    const { kind, a } = dialog
    const body = kind === 'approve' ? (text.trim() === '' ? {} : { commission_rate: Number(text) }) : { reason: text || 'Admin action' }
    const r = await authFetch(`/v2/admin/affiliates/${a.id}/${kind}`, { method: 'POST', body })
    if (!r.ok) { toast.error(r.error || 'That didn’t work'); return }
    list.patchRow(x => x.id === a.id, { status: kind === 'approve' ? 'approved' : 'suspended', ...(kind === 'approve' && text.trim() ? { commission_rate: Number(text) } : {}) })
    toast.success(kind === 'approve' ? `${a.referral_code} approved` : `${a.referral_code} suspended`)
    setDialog(null)
  }

  const columns: DTColumn<Affiliate>[] = [
    { key: 'name', header: 'Partner', cell: a => <div className={s.clip}><CellTitle title={a.business_name || a.store_name || a.profiles?.display_name || '-'} sub={a.profiles?.email} /></div> },
    { key: 'code', header: 'Code', cell: a => <span className={s.mono}>{a.referral_code}</span> },
    { key: 'rate', header: 'Commission', align: 'right', cell: a => `${Number(a.commission_rate || 0)}%` },
    { key: 'clicks', header: 'Clicks', align: 'right', cell: a => (a.click_count ?? 0).toLocaleString() },
    { key: 'status', header: 'Status', cell: a => <StatusBadge status={a.status === 'active' ? 'approved' : a.status === 'pending' ? 'pending_review' : a.status} audience="admin" /> },
    { key: 'since', header: 'Since', cell: a => <span className={s.secondary}>{fmtDate(a.created_at)}</span> },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
      cell: a => a.status === 'pending' ? <Button size="sm" onClick={() => setDialog({ kind: 'approve', a })}>Approve</Button>
        : a.status === 'approved' || a.status === 'active' ? <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'suspend', a })}>Suspend</Button>
        : null,
    },
  ]

  return (
    <>
      <AdminHead title="Affiliates" lede="Referral codes and the commission each one earns." />
      <DataTable
        caption="Affiliates"
        columns={columns}
        rows={list.rows}
        rowKey={a => a.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        pagination={list.pagination}
        onPage={p => list.setParams({ page: String(p) })}
        toolbar={<Filters label="Status" value={status} onChange={v => list.setParams({ status: v })} options={[
          { value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'suspended', label: 'Suspended' },
        ]} />}
        empty={<TableState title={status ? 'No affiliates with this status' : 'No affiliates yet'}>Approved partner applications get a referral code here.</TableState>}
      />
      <ConfirmDialog open={dialog?.kind === 'approve'} title={`Approve ${dialog?.a.referral_code}?`} confirmLabel="Approve"
        reasonLabel="Commission rate (%)" reasonType="number" reasonDefault={String(dialog?.a.commission_rate || 5)}
        reasonHint="Of each referred order’s total." onConfirm={act} onClose={() => setDialog(null)} />
      <ConfirmDialog open={dialog?.kind === 'suspend'} title={`Suspend ${dialog?.a.referral_code}?`} confirmLabel="Suspend" danger
        reasonLabel="Reason (optional)" onConfirm={act} onClose={() => setDialog(null)}>
        <p>Orders using this code stop earning commission until it’s approved again.</p>
      </ConfirmDialog>
    </>
  )
}
