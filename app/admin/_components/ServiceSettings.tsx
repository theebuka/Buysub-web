'use client'

// Service switches and programme settings (feature_flags), edited through
// /v2/admin/flags (buysub-api-deploy/src/features/status.ts). A switch saves
// as soon as it's flipped; turning something customer-facing off asks first.
// The API enforces every switch, and the storefront reads them from
// /v2/status within a minute. Only admins (not support agents) can change them.

import { useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Button, IconButton, Input, Skeleton } from '@/components/ui'
import { Panel, adminStyles as s } from '@/components/admin/AdminUI'
import { AreaField, SwitchRow, TextField } from '@/components/admin/AdminForm'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { TableState } from '@/components/admin/DataTable'
import { authFetch } from '@/lib/apiAuth'

type Flag = { enabled: boolean; config: Record<string, any>; exists: boolean }
type Flags = Record<string, Flag>
type Tier = { name: string; min_sales_ngn: number | string; rate: number | string }

/** Turning these OFF (or maintenance ON) affects shoppers right away, so it asks first. */
const CONFIRM: Record<string, { on?: string; off?: string }> = {
  maintenance_mode: { on: 'The storefront shows the maintenance page to everyone except staff. Orders can’t be placed.' },
  paystack_checkout: { off: 'Shoppers can’t pay by card or bank transfer until you switch it back on.' },
  whatsapp_checkout: { off: 'The “Order on WhatsApp” button disappears from checkout.' },
  wallet_enabled: { off: 'Shoppers can’t spend their wallet balance at checkout.' },
  partner_applications: { off: 'The partner application form is replaced with a “closed” notice.' },
}

const LABELS: Record<string, { label: string; hint: string }> = {
  maintenance_mode: { label: 'Maintenance mode', hint: 'Shows a maintenance page instead of the storefront. Staff and the admin console are unaffected.' },
  paystack_checkout: { label: 'Card and bank payments', hint: 'Paystack at checkout.' },
  whatsapp_checkout: { label: 'WhatsApp orders', hint: '“Order on WhatsApp” at checkout.' },
  wallet_enabled: { label: 'Pay from wallet', hint: 'Signed-in shoppers can put their wallet balance towards an order.' },
  wallet_funding: { label: 'Wallet top-ups', hint: 'Customers can add money to their wallet with Paystack.' },
  partner_applications: { label: 'Partner applications', hint: 'The application form at /partners.' },
  renewal_reminders: { label: 'Renewal reminders', hint: 'One email and notification per subscription before it ends. Sent daily at 9am.' },
  reviews: { label: 'Reviews and sold counts', hint: 'Ratings on product cards and reviews on product pages. Only buyers can review.' },
  customer_referrals: { label: 'Refer and earn', hint: 'Customers share a link and get wallet credit when a new customer’s first order is paid.' },
  partner_payouts: { label: 'Partner payout requests', hint: 'Partners request what they’ve earned; you pay it and mark it paid in Payouts.' },
  partner_tiers: { label: 'Partner tiers', hint: 'Partners move to a higher commission rate as their lifetime referred sales grow. Applies to new orders.' },
}

const num = (v: any) => (v === '' || v === null || v === undefined ? '' : String(v))

function Row({ k, flag, busy, onToggle, children, dirty, onSave }: {
  k: string; flag: Flag; busy: boolean; onToggle: (k: string, v: boolean) => void
  children?: ReactNode; dirty?: boolean; onSave?: () => void
}) {
  const meta = LABELS[k]
  return (
    <div className={s.flagRow}>
      <SwitchRow label={meta.label} checked={flag.enabled} disabled={busy || !flag.exists} onChange={v => onToggle(k, v)}
        hint={flag.exists ? meta.hint : 'Needs its database migration before it can be used.'} />
      {children && flag.exists && (
        <div className={s.flagConfig}>
          {children}
          {onSave && <div><Button size="sm" variant="secondary" disabled={!dirty || busy} onClick={onSave}>Save</Button></div>}
        </div>
      )}
    </div>
  )
}

export function ServiceSettings() {
  const [flags, setFlags] = useState<Flags | null>(null)
  const [draft, setDraft] = useState<Record<string, Record<string, any>>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [ask, setAsk] = useState<{ k: string; v: boolean; text: string } | null>(null)
  const [running, setRunning] = useState(false)

  const load = () => {
    setError('')
    authFetch<Flags>('/v2/admin/flags').then(r => {
      if (r.ok && r.data) {
        setFlags(r.data)
        setDraft(Object.fromEntries(Object.entries(r.data).map(([k, f]) => [k, { ...f.config }])))
      } else setError(r.error || 'Could not load the switches.')
    })
  }
  useEffect(load, [])

  const patch = async (k: string, body: { enabled?: boolean; config?: Record<string, any> }) => {
    setBusy(k)
    const r = await authFetch<{ enabled: boolean; config: Record<string, any> }>(`/v2/admin/flags/${k}`, { method: 'PATCH', body })
    setBusy('')
    if (!r.ok || !r.data) { toast.error(r.error || 'Couldn’t save'); return false }
    setFlags(f => f ? { ...f, [k]: { ...f[k], enabled: r.data!.enabled, config: r.data!.config } } : f)
    setDraft(d => ({ ...d, [k]: { ...r.data!.config } }))
    return true
  }

  const toggle = (k: string, v: boolean) => {
    const c = CONFIRM[k]
    const text = v ? c?.on : c?.off
    if (text) { setAsk({ k, v, text }); return }
    patch(k, { enabled: v }).then(ok => { if (ok) toast.success(`${LABELS[k].label} ${v ? 'on' : 'off'}`) })
  }

  const set = (k: string, field: string) => (v: any) => setDraft(d => ({ ...d, [k]: { ...d[k], [field]: v } }))
  const dirty = (k: string) => !!flags && JSON.stringify(draft[k] ?? {}) !== JSON.stringify(flags[k]?.config ?? {})
  const save = (k: string, fields: string[], numeric = true) => async () => {
    const cfg: Record<string, any> = {}
    for (const f of fields) cfg[f] = numeric ? Number(draft[k]?.[f]) : draft[k]?.[f]
    if (await patch(k, { config: cfg })) toast.success(`${LABELS[k].label} saved`)
  }

  const runReminders = async () => {
    setRunning(true)
    const r = await authFetch<{ sent: number; skipped: number }>('/v2/admin/jobs/renewal-reminders', { method: 'POST' })
    setRunning(false)
    if (!r.ok) { toast.error(r.error || 'Couldn’t run the reminders'); return }
    toast.success(`${r.data?.sent ?? 0} reminder${r.data?.sent === 1 ? '' : 's'} sent${r.data?.skipped ? `, ${r.data.skipped} already renewed` : ''}`)
  }

  if (error) return <Panel><TableState error title="Couldn’t load the switches" action={<Button size="sm" variant="secondary" onClick={load}>Try again</Button>}>{error}</TableState></Panel>
  if (!flags) return <Skeleton height={420} radius="var(--bs-radius-lg)" />

  const f = (k: string): Flag => flags[k] ?? { enabled: false, config: {}, exists: false }
  const tiers: Tier[] = Array.isArray(draft.partner_tiers?.tiers) ? draft.partner_tiers.tiers : []
  const setTier = (i: number, field: keyof Tier) => (v: string) =>
    set('partner_tiers', 'tiers')(tiers.map((t, j) => j === i ? { ...t, [field]: v } : t))
  const common = (k: string) => ({ k, flag: f(k), busy: busy === k, onToggle: toggle })

  return (
    <>
      <Panel title="Service switches" style={{ maxWidth: 760 }}>
        <div className={s.flagList}>
          <Row {...common('maintenance_mode')} dirty={dirty('maintenance_mode')} onSave={save('maintenance_mode', ['message'], false)}>
            <AreaField label="Message" rows={2} value={draft.maintenance_mode?.message} onChange={set('maintenance_mode', 'message')}
              placeholder="We’re upgrading checkout. Back by 2pm." />
          </Row>
          <Row {...common('paystack_checkout')} />
          <Row {...common('whatsapp_checkout')} />
          <Row {...common('wallet_enabled')} />
          <Row {...common('wallet_funding')} dirty={dirty('wallet_funding')} onSave={save('wallet_funding', ['min_ngn', 'max_ngn'])}>
            <div className={s.cols2}>
              <TextField label="Smallest top-up (₦)" type="number" value={num(draft.wallet_funding?.min_ngn)} onChange={set('wallet_funding', 'min_ngn')} />
              <TextField label="Largest top-up (₦)" type="number" value={num(draft.wallet_funding?.max_ngn)} onChange={set('wallet_funding', 'max_ngn')} />
            </div>
          </Row>
          <Row {...common('partner_applications')} />
        </div>
      </Panel>

      <Panel title="Programmes" style={{ maxWidth: 760 }}>
        <div className={s.flagList}>
          <Row {...common('renewal_reminders')} dirty={dirty('renewal_reminders')} onSave={save('renewal_reminders', ['days_before'])}>
            <div className={s.cols2}>
              <TextField label="Days before it ends" type="number" value={num(draft.renewal_reminders?.days_before)} onChange={set('renewal_reminders', 'days_before')} />
            </div>
            <div><Button size="sm" variant="ghost" loading={running} disabled={!f('renewal_reminders').enabled} onClick={runReminders}>Send due reminders now</Button></div>
          </Row>
          <Row {...common('reviews')} dirty={dirty('reviews')} onSave={save('reviews', ['show_sold_from'])}>
            <div className={s.cols2}>
              <TextField label="Show “sold” count from" type="number" hint="Below this, product cards don’t show a sold count." value={num(draft.reviews?.show_sold_from)} onChange={set('reviews', 'show_sold_from')} />
            </div>
          </Row>
          <Row {...common('customer_referrals')} dirty={dirty('customer_referrals')} onSave={save('customer_referrals', ['reward_ngn', 'friend_reward_ngn', 'min_order_ngn'])}>
            <div className={s.cols2}>
              <TextField label="Reward to the referrer (₦)" type="number" value={num(draft.customer_referrals?.reward_ngn)} onChange={set('customer_referrals', 'reward_ngn')} />
              <TextField label="Welcome reward to the friend (₦)" type="number" hint="Only if they have an account. 0 for none." value={num(draft.customer_referrals?.friend_reward_ngn)} onChange={set('customer_referrals', 'friend_reward_ngn')} />
              <TextField label="Minimum first order (₦)" type="number" hint="After discounts." value={num(draft.customer_referrals?.min_order_ngn)} onChange={set('customer_referrals', 'min_order_ngn')} />
            </div>
          </Row>
          <Row {...common('partner_payouts')} dirty={dirty('partner_payouts')} onSave={save('partner_payouts', ['min_ngn', 'hold_days'])}>
            <div className={s.cols2}>
              <TextField label="Minimum payout (₦)" type="number" value={num(draft.partner_payouts?.min_ngn)} onChange={set('partner_payouts', 'min_ngn')} />
              <TextField label="Hold period (days)" type="number" hint="Commission becomes requestable this long after the order is paid." value={num(draft.partner_payouts?.hold_days)} onChange={set('partner_payouts', 'hold_days')} />
            </div>
          </Row>
          <Row {...common('partner_tiers')} dirty={dirty('partner_tiers')} onSave={async () => {
            const clean = tiers.map(t => ({ name: String(t.name).trim(), min_sales_ngn: Number(t.min_sales_ngn), rate: Number(t.rate) }))
            if (await patch('partner_tiers', { config: { tiers: clean } })) toast.success('Partner tiers saved')
          }}>
            <div className={s.tierGrid}>
              <span className={s.tierHead}>Tier</span><span className={s.tierHead}>From sales (₦)</span><span className={s.tierHead}>Rate (%)</span><span />
              {tiers.map((t, i) => (
                <div key={i} style={{ display: 'contents' }}>
                  <Input fieldSize="md" aria-label={`Tier ${i + 1} name`} value={t.name} onChange={e => setTier(i, 'name')(e.target.value)} />
                  <Input fieldSize="md" aria-label={`Tier ${i + 1} from sales`} type="number" value={num(t.min_sales_ngn)} onChange={e => setTier(i, 'min_sales_ngn')(e.target.value)} />
                  <Input fieldSize="md" aria-label={`Tier ${i + 1} rate`} type="number" value={num(t.rate)} onChange={e => setTier(i, 'rate')(e.target.value)} />
                  <IconButton icon="close" size="sm" label={`Remove tier ${i + 1}`} disabled={tiers.length <= 1}
                    onClick={() => set('partner_tiers', 'tiers')(tiers.filter((_, j) => j !== i))} />
                </div>
              ))}
            </div>
            <div>
              <Button size="sm" variant="ghost" icon="plus" disabled={tiers.length >= 8}
                onClick={() => set('partner_tiers', 'tiers')([...tiers, { name: '', min_sales_ngn: '', rate: '' }])}>Add tier</Button>
            </div>
            <p className={s.secondary}>A partner earns the higher of their own rate and their tier’s rate.</p>
          </Row>
        </div>
      </Panel>

      <ConfirmDialog open={!!ask} title={ask ? `${ask.v ? 'Turn on' : 'Turn off'} ${LABELS[ask.k].label.toLowerCase()}?` : ''}
        confirmLabel={ask?.v ? 'Turn on' : 'Turn off'} danger
        onConfirm={async () => {
          if (!ask) return
          if (await patch(ask.k, { enabled: ask.v })) toast.success(`${LABELS[ask.k].label} ${ask.v ? 'on' : 'off'}`)
          setAsk(null)
        }}
        onClose={() => setAsk(null)}>
        <p>{ask?.text}</p>
      </ConfirmDialog>
    </>
  )
}
