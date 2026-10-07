'use client'

// /admin/customers: searchable customer table. Selecting a customer opens a
// side panel with their details, wallet (top up / debit), a message composer
// for credentials and notes, and a forced password reset.

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge, Button } from '@/components/ui'
import { copyText } from '@/components/ui/CopyField'
import { DataTable, Filters, SearchBox, TableState, type DTColumn } from '@/components/admin/DataTable'
import { AdminHead, CellTitle, DL, adminStyles as s } from '@/components/admin/AdminUI'
import { AreaField, FormSection, SelectField, SidePanel, TextField } from '@/components/admin/AdminForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { authFetch } from '@/lib/apiAuth'
import { fmtDate, fmtNGN, initials } from '@/lib/format'
import { useAdminList } from '../_lib/useAdminList'
import type { Customer } from '../_lib/shared'

const TOPUP_SOURCES = [
  { value: 'admin_topup', label: 'Manual top-up' },
  { value: 'refund', label: 'Order refund' },
  { value: 'promotion', label: 'Promotion or bonus' },
  { value: 'compensation', label: 'Compensation' },
]

function Avatar({ c }: { c: Customer }) {
  return (
    <span aria-hidden="true" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bs-bg-elevated)', color: 'var(--bs-text-secondary)', fontSize: 'var(--bs-text-xs)', fontWeight: 600 }}>
      {initials(c.name || c.email)}
    </span>
  )
}

function WalletSection({ customer }: { customer: Customer }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [mode, setMode] = useState<'topup' | 'debit'>('topup')
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState('admin_topup')
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    let live = true
    authFetch<{ balance_ngn: number }>(`/v2/admin/customers/${customer.id}/wallet`).then(r => {
      if (live) setBalance(r.ok ? Number(r.data?.balance_ngn ?? 0) : null)
    })
    return () => { live = false }
  }, [customer.id])

  const amt = Number(amount)
  const invalid = !(amt > 0) || (mode === 'debit' && balance != null && amt > balance)

  const submit = async () => {
    const r = mode === 'topup'
      ? await authFetch(`/v2/admin/customers/${customer.id}/wallet/topup`, { method: 'POST', body: { amount_ngn: amt, source, reference: reference || null, note: note || null } })
      : await authFetch(`/v2/admin/wallet/debit`, { method: 'POST', body: { customer_id: customer.id, amount: amt, reference: reference || 'Admin debit' } })
    if (!r.ok) { toast.error(r.error || (mode === 'topup' ? 'Top-up failed' : 'Debit failed')); return }
    const next = (r.data as any)?.balance_ngn
    setBalance(typeof next === 'number' ? next : balance == null ? null : mode === 'topup' ? balance + amt : balance - amt)
    toast.success(mode === 'topup' ? `Added ${fmtNGN(amt)}` : `Deducted ${fmtNGN(amt)}`)
    setAmount(''); setReference(''); setNote(''); setConfirm(false)
  }

  return (
    <FormSection title="Wallet" hint={balance == null ? 'Loading balance…' : <>Balance <b className={s.strong}>{fmtNGN(balance)}</b></>}>
      <Filters label="Wallet action" value={mode} onChange={v => setMode(v as any)} options={[{ value: 'topup', label: 'Top up' }, { value: 'debit', label: 'Debit' }]} />
      <div className={s.cols2}>
        <TextField label="Amount (₦)" type="number" inputMode="numeric" min={0} value={amount} onChange={setAmount}
          error={mode === 'debit' && balance != null && amt > balance ? 'More than the balance' : undefined} />
        {mode === 'topup'
          ? <SelectField label="Reason" value={source} onChange={setSource} options={TOPUP_SOURCES} />
          : <TextField label="Reason" value={reference} onChange={setReference} placeholder="Correction, manual charge…" />}
        {mode === 'topup' && <TextField label="Reference" value={reference} onChange={setReference} placeholder="Order ref or transaction ID" />}
        {mode === 'topup' && <TextField label="Internal note" value={note} onChange={setNote} />}
      </div>
      <div>
        <Button size="md" variant={mode === 'debit' ? 'danger' : 'primary'} disabled={invalid} onClick={() => setConfirm(true)}>
          {mode === 'topup' ? 'Top up' : 'Debit'}{amt > 0 ? ` ${fmtNGN(amt)}` : ''}
        </Button>
      </div>
      <ConfirmDialog open={confirm} title={mode === 'topup' ? 'Top up this wallet?' : 'Debit this wallet?'}
        confirmLabel={mode === 'topup' ? `Add ${fmtNGN(amt)}` : `Deduct ${fmtNGN(amt)}`} danger={mode === 'debit'}
        onConfirm={submit} onClose={() => setConfirm(false)}>
        <p>{mode === 'topup' ? 'Adds' : 'Removes'} {fmtNGN(amt)} {mode === 'topup' ? 'to' : 'from'} {customer.name || customer.email}’s wallet. The customer sees this in their wallet history.</p>
      </ConfirmDialog>
    </FormSection>
  )
}

function MessageSection({ customer }: { customer: Customer }) {
  const blank = { subject: '', product_name: '', product_domain: '', body: '', expires_at: '' }
  const [form, setForm] = useState(blank)
  const [sending, setSending] = useState(false)
  const set = (k: keyof typeof blank) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  const send = async () => {
    setSending(true)
    const r = await authFetch(`/v2/admin/customers/${customer.id}/messages`, {
      method: 'POST',
      body: {
        subject: form.subject.trim(), body: form.body.trim(),
        product_name: form.product_name || null, product_domain: form.product_domain || null,
        expires_at: form.expires_at || null,
      },
    })
    setSending(false)
    if (r.ok) { toast.success('Message sent'); setForm(blank) } else toast.error(r.error || 'Couldn’t send the message')
  }
  return (
    <FormSection title="Send a message" hint="Appears in the customer’s Messages. Use it for login details and account notes.">
      <TextField label="Subject" value={form.subject} onChange={set('subject')} placeholder="Your Netflix login" />
      <div className={s.cols2}>
        <TextField label="Product" value={form.product_name} onChange={set('product_name')} placeholder="Netflix" />
        <TextField label="Product domain" value={form.product_domain} onChange={set('product_domain')} placeholder="netflix.com" hint="Shows the logo." />
      </div>
      <AreaField label="Message" rows={6} value={form.body} onChange={set('body')} placeholder={'Email: …\nPassword: …\n\nActive until 31 Dec.'} />
      <TextField label="Hide after" type="date" value={form.expires_at} onChange={set('expires_at')} hint="Optional. The message disappears after this date." />
      <div><Button size="md" loading={sending} disabled={!form.subject.trim() || !form.body.trim()} onClick={send}>Send message</Button></div>
    </FormSection>
  )
}

function SecuritySection({ customer }: { customer: Customer }) {
  const [confirm, setConfirm] = useState(false)
  const [temp, setTemp] = useState<string | null>(null)
  const reset = async () => {
    const r = await authFetch<{ temp_password: string }>(`/v2/admin/customers/${customer.id}/reset-password`, { method: 'POST' })
    setConfirm(false)
    if (r.ok && r.data?.temp_password) setTemp(r.data.temp_password)
    else toast.error(r.error || 'Reset failed. The customer may not have a login yet.')
  }
  return (
    <FormSection title="Sign-in" hint="Replaces the password with a temporary one, shown here once.">
      {temp ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bs-space-3)', padding: 'var(--bs-space-3)', border: '1px solid var(--bs-border-default)', borderRadius: 'var(--bs-radius-md)' }}>
          <code className={s.mono} style={{ flex: 1, fontSize: 'var(--bs-text-base)', letterSpacing: '.04em' }}>{temp}</code>
          <Button size="sm" variant="secondary" icon="copy" onClick={async () => { if (await copyText(temp)) toast.success('Copied') }}>Copy</Button>
        </div>
      ) : (
        <div><Button size="md" variant="secondary" onClick={() => setConfirm(true)}>Reset password</Button></div>
      )}
      <ConfirmDialog open={confirm} title="Reset this password?" confirmLabel="Reset password" danger onConfirm={reset} onClose={() => setConfirm(false)}>
        <p>{customer.email} will be signed out and need the temporary password to sign in. Share it with them privately.</p>
      </ConfirmDialog>
    </FormSection>
  )
}

function CustomerPanel({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  return (
    <SidePanel open={!!customer} onClose={onClose} width={560}
      title={customer ? customer.name || customer.email : ''}
      subtitle={customer?.name ? customer.email : undefined}>
      {customer && (
        <>
          <FormSection title="Details">
            <DL rows={[
              ['Email', customer.email ? <a className={s.textLink} href={`mailto:${customer.email}`}>{customer.email}</a> : '-'],
              ['Phone', customer.phone || '-'],
              ['Status', customer.is_active ? 'Active' : 'Inactive'],
              ['Source', customer.source || '-'],
              ['Segment', customer.category || '-'],
              ['Joined', fmtDate(customer.created_at)],
            ]} />
            {customer.email && <Link className={s.panelLink} href={`/admin/orders?q=${encodeURIComponent(customer.email)}`}>View their orders</Link>}
          </FormSection>
          <WalletSection key={`w-${customer.id}`} customer={customer} />
          <MessageSection key={`m-${customer.id}`} customer={customer} />
          <SecuritySection key={`s-${customer.id}`} customer={customer} />
        </>
      )}
    </SidePanel>
  )
}

export function CustomersTab() {
  const list = useAdminList<Customer>('/v2/admin/customers', { limit: 25 })
  const [open, setOpen] = useState<Customer | null>(null)

  const columns: DTColumn<Customer>[] = [
    {
      key: 'name', header: 'Customer',
      cell: c => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bs-space-3)', minWidth: 0, maxWidth: 360 }}>
          <Avatar c={c} />
          <CellTitle title={<button type="button" className={s.textLink} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }} onClick={() => setOpen(c)}>{c.name || c.email}</button>} sub={c.name ? c.email : ''} />
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: c => <span className={s.secondary}>{c.phone || '-'}</span> },
    { key: 'source', header: 'Source', cell: c => <span className={s.secondary}>{c.source || '-'}</span> },
    { key: 'status', header: 'Status', cell: c => c.is_active ? <Badge tone="success" dot>Active</Badge> : <Badge tone="neutral" dot>Inactive</Badge> },
    { key: 'joined', header: 'Joined', align: 'right', cell: c => <span className={s.secondary}>{fmtDate(c.created_at)}</span> },
  ]

  return (
    <>
      <AdminHead title="Customers" lede={list.pagination.total ? `${list.pagination.total.toLocaleString()} customers` : undefined} />
      <DataTable
        caption="Customers"
        columns={columns}
        rows={list.rows}
        rowKey={c => c.id}
        onRowClick={setOpen}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        pagination={list.pagination}
        onPage={p => list.setParams({ page: String(p) })}
        toolbar={<SearchBox value={list.params.q || ''} onChange={q => list.setParams({ q })} placeholder="Search name, email or phone" />}
        empty={list.params.q
          ? <TableState title={`No customers match “${list.params.q}”`}>Search looks at name, email and phone.</TableState>
          : <TableState title="No customers yet" />}
      />
      <CustomerPanel customer={open} onClose={() => setOpen(null)} />
    </>
  )
}
