'use client'

// /admin/payouts: partner payout requests. Send the money first (bank
// transfer or crypto, outside BuySub), then mark the request paid with the
// transfer reference. Declining needs a reason the partner will see; their
// commission becomes requestable again.

import { useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button, CopyField } from '@/components/ui'
import { DataTable, Filters, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, adminStyles as s } from '@/components/admin/AdminUI'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { authFetch } from '@/lib/apiAuth'
import { invalidate } from '@/lib/useApi'
import { fmtDate, fmtNGN } from '@/lib/format'
import { payoutStatus } from '@/lib/status'
import { useAdminList } from '../_lib/useAdminList'

type Payout = {
  id: string; amount_ngn: number; status: string; created_at: string; processed_at: string | null
  admin_note: string | null; reference: string | null
  payout_details: { payout_method?: string; bank_name?: string; account_name?: string; account_number?: string; crypto_token?: string; crypto_chain?: string; wallet_address?: string }
  affiliates?: { store_name?: string | null; business_name?: string | null; referral_code?: string } | null
}

function Destination({ d }: { d: Payout['payout_details'] }) {
  if (/crypto/i.test(d.payout_method || '') || d.wallet_address) {
    return (
      <div style={{ display: 'grid', gap: 4, minWidth: 220 }}>
        <span className={s.secondary}>{d.crypto_token || 'Crypto'}{d.crypto_chain ? ` on ${d.crypto_chain}` : ''}</span>
        {d.wallet_address && <CopyField value={d.wallet_address} label="Copy address" display={`${d.wallet_address.slice(0, 8)}…${d.wallet_address.slice(-6)}`} />}
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gap: 2 }}>
      <span>{d.account_name || '-'}</span>
      <span className={s.secondary}>{d.bank_name || 'Bank'} · <span className={s.mono}>{d.account_number || '-'}</span></span>
    </div>
  )
}

export function PayoutsTab() {
  const list = useAdminList<Payout>('/v2/admin/payouts', { params: ['status'], limit: 25 })
  const status = list.params.status ?? ''
  const [dialog, setDialog] = useState<{ kind: 'paid' | 'rejected'; p: Payout } | null>(null)

  const settle = async (text: string) => {
    if (!dialog) return
    const { kind, p } = dialog
    const r = await authFetch(`/v2/admin/payouts/${p.id}/settle`, {
      method: 'POST', body: kind === 'paid' ? { action: 'paid', reference: text } : { action: 'rejected', note: text },
    })
    if (!r.ok) { toast.error(r.error || 'That didn’t work'); return }
    list.patchRow(x => x.id === p.id, { status: kind, processed_at: new Date().toISOString(), ...(kind === 'paid' ? { reference: text || null } : { admin_note: text }) })
    invalidate('/v2/admin/stats')
    toast.success(kind === 'paid' ? `${fmtNGN(p.amount_ngn)} marked paid` : 'Payout declined')
    setDialog(null)
  }

  const name = (p: Payout) => p.affiliates?.store_name || p.affiliates?.business_name || p.affiliates?.referral_code || 'Partner'
  const columns: DTColumn<Payout>[] = [
    { key: 'partner', header: 'Partner', cell: p => <div className={s.clip}><CellTitle title={name(p)} sub={p.affiliates?.referral_code} /></div> },
    { key: 'amount', header: 'Amount', align: 'right', cell: p => <b className={s.num}>{fmtNGN(p.amount_ngn)}</b> },
    { key: 'to', header: 'Pay to', cell: p => <Destination d={p.payout_details || {}} /> },
    { key: 'requested', header: 'Requested', cell: p => <span className={s.secondary}>{fmtDate(p.created_at)}</span> },
    {
      key: 'status', header: 'Status', cell: p => {
        const st = payoutStatus(p.status)
        return (
          <div style={{ display: 'grid', gap: 2 }}>
            <span><Badge tone={st.tone}>{st.label}</Badge></span>
            {p.status === 'paid' && p.reference && <span className={s.secondary}>Ref {p.reference}</span>}
            {p.status === 'rejected' && p.admin_note && <span className={s.secondary} style={{ whiteSpace: 'normal', maxWidth: 220 }}>{p.admin_note}</span>}
          </div>
        )
      },
    },
    {
      key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right',
      cell: p => p.status === 'pending' ? (
        <div style={{ display: 'inline-flex', gap: 'var(--bs-space-2)' }}>
          <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: 'rejected', p })}>Decline</Button>
          <Button size="sm" onClick={() => setDialog({ kind: 'paid', p })}>Mark paid</Button>
        </div>
      ) : null,
    },
  ]

  return (
    <>
      <AdminHead title="Payouts" lede="Partner payout requests. Send the money, then mark the request paid." />
      <DataTable
        caption="Payout requests"
        columns={columns}
        rows={list.rows}
        rowKey={p => p.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        pagination={list.pagination}
        onPage={p => list.setParams({ page: String(p) })}
        toolbar={<Filters label="Status" value={status} onChange={v => list.setParams({ status: v })} options={[
          { value: '', label: 'All' }, { value: 'pending', label: 'Requested' }, { value: 'paid', label: 'Paid' }, { value: 'rejected', label: 'Declined' },
        ]} />}
        empty={<TableState title={status === 'pending' ? 'Nothing waiting' : status ? 'No payouts with this status' : 'No payout requests yet'}>Partners request payouts from their portal once they have enough available.</TableState>}
      />
      <ConfirmDialog open={dialog?.kind === 'paid'} title={dialog ? `Mark ${fmtNGN(dialog.p.amount_ngn)} to ${name(dialog.p)} as paid?` : ''}
        confirmLabel="Mark paid" reasonLabel="Transfer reference (optional)" reasonHint="Shown to the partner."
        onConfirm={settle} onClose={() => setDialog(null)}>
        <p>Only do this once the money has been sent. The partner is notified and the commissions are marked paid.</p>
      </ConfirmDialog>
      <ConfirmDialog open={dialog?.kind === 'rejected'} title="Decline this payout?" confirmLabel="Decline" danger
        reasonLabel="Reason" reasonRequired reasonHint="The partner sees this, so say what to fix."
        onConfirm={settle} onClose={() => setDialog(null)}>
        <p>The commission goes back to the partner’s available balance to request again.</p>
      </ConfirmDialog>
    </>
  )
}
