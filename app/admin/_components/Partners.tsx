'use client'

// /admin/partners: partner applications. Opening one shows everything the
// applicant submitted, with approve / reject for those still in review.

import { useState } from 'react'
import { toast } from 'sonner'
import { Button, StatusBadge } from '@/components/ui'
import { DataTable, Filters, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, DL, adminStyles as s } from '@/components/admin/AdminUI'
import { FormSection, SidePanel } from '@/components/admin/AdminForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { authFetch } from '@/lib/apiAuth'
import { invalidate } from '@/lib/useApi'
import { fmtDate } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'
import type { PartnerApp } from '../_lib/shared'

const mask = (n: string | null) => n ? `•••• ${String(n).slice(-4)}` : '-'
/** Applications use pending_review; an older 'pending' must not read as the order status. */
const appStatus = (st: string) => st === 'pending' ? 'pending_review' : st
const human = (v: string | null | undefined) => v ? v.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : '-'

function Review({ app, onClose, onDone }: { app: PartnerApp | null; onClose: () => void; onDone: (id: string, status: string) => void }) {
  const [dialog, setDialog] = useState<null | 'approve' | 'reject'>(null)
  const act = async (kind: 'approve' | 'reject', text: string) => {
    if (!app) return
    const r = await authFetch(`/v2/admin/partners/${app.id}/${kind}`, { method: 'POST', body: kind === 'approve' ? { notes: text } : { reason: text } })
    if (!r.ok) { toast.error(r.error || 'That didn’t work'); return }
    toast.success(kind === 'approve' ? `${app.store_name || app.legal_name} approved` : 'Application rejected')
    invalidate('/v2/admin/stats')
    setDialog(null)
    onDone(app.id, kind === 'approve' ? 'approved' : 'rejected')
  }
  const pending = app?.status === 'pending_review' || app?.status === 'pending'
  return (
    <SidePanel open={!!app} onClose={onClose} width={600}
      title={app?.store_name || app?.legal_name || ''}
      subtitle={app ? `Applied ${fmtDate(app.created_at)}` : undefined}
      footer={pending ? <>
        <Button size="md" variant="secondary" onClick={() => setDialog('reject')}>Reject</Button>
        <Button size="md" onClick={() => setDialog('approve')}>Approve</Button>
      </> : undefined}>
      {app && (
        <>
          <FormSection title="Status">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bs-space-3)' }}><StatusBadge status={appStatus(app.status)} audience="admin" /></div>
            {app.reviewer_notes && <p className={s.secondary}>{app.reviewer_notes}</p>}
          </FormSection>
          <FormSection title="Business">
            <DL rows={[
              ['Store name', app.store_name], ['Sells on', app.social_media || '-'],
              ['Legal name', app.legal_name || '-'], ['CAC number', app.cac_number || '-'], ['Registered', app.registration_year ? String(app.registration_year) : '-'],
              ['Email', app.business_email || '-'], ['Phone', app.business_phone || '-'],
              ['Address', [app.address, app.lga, app.state].filter(Boolean).join(', ') || '-'],
            ]} />
          </FormSection>
          <FormSection title="Owner">
            <DL rows={[
              ['Name', app.owner_name], ['Email', app.owner_email ? <a className={s.textLink} href={`mailto:${app.owner_email}`}>{app.owner_email}</a> : '-'],
              ['Phone', app.owner_phone || '-'], ['Gender', human(app.gender)], ['Prefers', human(app.contact_method)],
            ]} />
          </FormSection>
          <FormSection title="Payout">
            {!app.payout_method && !app.bank_name && !app.wallet_address && (
              <p className={s.secondary}>Not added yet. Partners add payout details in their portal after approval, and payouts wait until they do.</p>
            )}
            <DL rows={[
              ['AML declaration', app.aml_accepted ? 'Accepted' : 'Not yet'],
              ['Method', human(app.payout_method)], ['Frequency', human(app.payout_frequency)],
              ['Bank', app.bank_name || ''], ['Account name', app.account_name || ''], ['Account number', app.account_number ? mask(app.account_number) : ''],
              ['Crypto', app.crypto_token ? `${app.crypto_token}${app.crypto_chain ? ` on ${app.crypto_chain}` : ''}` : ''],
              ['Wallet address', app.wallet_address ? <span className={s.mono}>{app.wallet_address}</span> : ''],
            ]} />
          </FormSection>
        </>
      )}
      <ConfirmDialog open={dialog === 'approve'} title="Approve this partner?" confirmLabel="Approve"
        reasonLabel="Note to the applicant (optional)" onConfirm={t => act('approve', t)} onClose={() => setDialog(null)}>
        <p>They’ll get an email and can sign in to the partner portal. A referral code is issued from Affiliates.</p>
      </ConfirmDialog>
      <ConfirmDialog open={dialog === 'reject'} title="Reject this application?" confirmLabel="Reject" danger
        reasonLabel="Reason (shown to the applicant)" reasonRequired onConfirm={t => act('reject', t)} onClose={() => setDialog(null)} />
    </SidePanel>
  )
}

export function PartnersTab() {
  const list = useAdminList<PartnerApp>('/v2/admin/partners', { params: ['status'], limit: 25 })
  const [open, setOpen] = useState<PartnerApp | null>(null)
  const status = list.params.status || ''
  const columns: DTColumn<PartnerApp>[] = [
    { key: 'store', header: 'Business', cell: a => <div className={s.clip}><CellTitle title={a.store_name || a.legal_name} sub={a.legal_name && a.legal_name !== a.store_name ? a.legal_name : a.business_email || a.owner_email} /></div> },
    { key: 'owner', header: 'Owner', cell: a => <div className={s.clip}><CellTitle title={a.owner_name} sub={a.owner_email} /></div> },
    { key: 'where', header: 'Location', cell: a => <span className={s.secondary}>{[a.lga, a.state].filter(Boolean).join(', ') || '-'}</span> },
    { key: 'payout', header: 'Payout', cell: a => <span className={s.secondary}>{human(a.payout_method)}</span> },
    { key: 'status', header: 'Status', cell: a => <StatusBadge status={appStatus(a.status)} audience="admin" /> },
    { key: 'date', header: 'Applied', align: 'right', cell: a => <span className={s.secondary}>{fmtDate(a.created_at)}</span> },
  ]
  return (
    <>
      <AdminHead title="Partner applications" lede="Businesses applying to sell BuySub subscriptions on commission." />
      <DataTable
        caption="Partner applications"
        columns={columns}
        rows={list.rows}
        rowKey={a => a.id}
        onRowClick={setOpen}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        pagination={list.pagination}
        onPage={p => list.setParams({ page: String(p) })}
        toolbar={<Filters label="Status" value={status} onChange={v => list.setParams({ status: v })} options={[
          { value: '', label: 'All' }, { value: 'pending_review', label: 'Pending review' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
        ]} />}
        empty={<TableState title={status ? 'No applications with this status' : 'No applications yet'}>New applications from the partner page appear here.</TableState>}
      />
      <Review app={open} onClose={() => setOpen(null)} onDone={(id, st) => { list.patchRow(a => a.id === id, { status: st }); setOpen(o => o && o.id === id ? { ...o, status: st } : o) }} />
    </>
  )
}
