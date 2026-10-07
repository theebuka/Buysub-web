'use client'

// ============================================================
// BUYSUB — Support inbox (customers, partners and staff)
// ============================================================
// Two panes: the conversation list and the open conversation. On phones one
// pane at a time. The selected conversation is in the URL (?t=<id>), so a
// notification can link straight to it; ?new=1 opens the composer, and
// ?order=<ref> starts one about that order (the order page links here).
//
// `mode` picks the side: 'user' for /account/support and /partner/support,
// 'admin' for /admin/support.

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { invalidate } from '@/lib/useApi'
import { Button, Field, Icon, IconButton, Input, Skeleton, Textarea } from '@/components/ui'
import { fmtDate, fmtRelative } from '@/lib/format'
import {
  openThread, sendReply, setThreadStatus, useSupportThread,
  type SupportAudience, type SupportMessage, type SupportThread,
} from '@/lib/support'
import s from './support.module.css'

type Mode = 'user' | 'admin'

function timeOf(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

function dayOf(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(); y.setDate(y.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return fmtDate(d)
}

// ── List ─────────────────────────────────────────────────────

function ThreadItem({ t, mode, active, onOpen }: { t: SupportThread; mode: Mode; active: boolean; onOpen: () => void }) {
  const unread = mode === 'admin' ? t.admin_unread : t.user_unread
  const who = mode === 'admin' ? (t.user?.full_name || t.user?.email || 'Unknown user') : null
  const waiting = mode === 'admin' && t.status === 'open' && t.last_sender === 'user'
  return (
    <li>
      <button type="button" className={`${s.item} ${unread ? s.itemUnread : ''}`} aria-current={active ? 'true' : undefined} onClick={onOpen}>
        <span className={s.itemTop}>
          <span className={s.itemTitle}>{who || t.subject}</span>
          <span className={s.itemTime}>{fmtRelative(t.last_message_at)}</span>
        </span>
        {who && <span className={s.itemSubject}>{t.subject}</span>}
        <span className={s.itemPreview}>
          {t.last_sender === (mode === 'admin' ? 'admin' : 'user') && <span className={s.you}>You: </span>}
          {t.last_message_preview || ' '}
        </span>
        <span className={s.itemMeta}>
          {t.status === 'closed' ? <span className={s.state}>Resolved</span>
            : waiting ? <span className={`${s.state} ${s.stateWait}`}>Awaiting reply</span> : null}
          {mode === 'admin' && t.audience === 'partner' && <span className={s.state}>Partner</span>}
          {t.order_ref && <span className={s.state}>{t.order_ref}</span>}
          {unread > 0 && <span className={s.count} aria-label={`${unread} unread`}>{unread}</span>}
        </span>
      </button>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul className={s.list} aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <li key={i} className={s.item} style={{ cursor: 'default' }}>
          <span className={s.itemTop}><Skeleton width="55%" height={14} /><Skeleton width={40} height={12} /></span>
          <Skeleton width="85%" height={12} />
        </li>
      ))}
    </ul>
  )
}

// ── Conversation ─────────────────────────────────────────────

function Bubble({ m, mode, showLabel }: { m: SupportMessage; mode: Mode; showLabel: boolean }) {
  const mine = mode === 'admin' ? m.sender === 'admin' : m.sender === 'user'
  return (
    <div className={`${s.msg} ${mine ? s.msgMine : s.msgTheirs}`}>
      {showLabel && !mine && <span className={s.msgWho}>{m.sender === 'admin' ? 'BuySub support' : 'Customer'}</span>}
      <div className={s.bubble}>{m.body}</div>
      <span className={s.msgTime}>{timeOf(m.created_at)}</span>
    </div>
  )
}

function Composer({ onSend, disabled, placeholder }: { onSend: (body: string) => Promise<boolean>; disabled?: boolean; placeholder: string }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [text])
  const send = async (e?: FormEvent) => {
    e?.preventDefault()
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    const sent = await onSend(body)
    setBusy(false)
    if (sent) { setText(''); ref.current?.focus() }
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() }
  }
  return (
    <form className={s.composer} onSubmit={send}>
      <textarea ref={ref} rows={1} className={s.composerInput} value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey}
        placeholder={placeholder} aria-label="Message" maxLength={4000} disabled={disabled} />
      <Button type="submit" size="md" icon="arrowRight" loading={busy} disabled={disabled || !text.trim()} aria-label="Send message">Send</Button>
    </form>
  )
}

function Conversation({ id, mode, onBack }: { id: string; mode: Mode; onBack: () => void }) {
  const admin = mode === 'admin'
  const { data, error, loading, reload } = useSupportThread(id, admin)
  const [pending, setPending] = useState<SupportMessage[]>([])
  const stream = useRef<HTMLDivElement>(null)
  const messages = useMemo(() => {
    const seen = new Set((data?.messages || []).map(m => m.id))
    return [...(data?.messages || []), ...pending.filter(m => !seen.has(m.id))]
  }, [data, pending])
  useEffect(() => { setPending([]) }, [id])
  // Opening a conversation marks it read on the server; refresh the lists so
  // the unread badges drop. Prefixes chosen so this never refetches itself.
  const loaded = !!data
  useEffect(() => {
    if (loaded) invalidate(admin ? '/v2/admin/support?' : '/v2/me/support?audience')
  }, [loaded, id, admin])
  useEffect(() => {
    const el = stream.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, id])

  if (loading && !data) {
    return (
      <div className={s.convo} aria-busy="true">
        <div className={s.convoHead}><Skeleton width={220} height={18} /></div>
        <div className={s.stream}>
          <Skeleton width="60%" height={56} radius="var(--bs-radius-lg)" />
          <Skeleton width="45%" height={40} radius="var(--bs-radius-lg)" style={{ alignSelf: 'flex-end' }} />
        </div>
      </div>
    )
  }
  if (error || !data) {
    return <div className={s.convo}><div className={s.blank}><p className={s.blankTitle}>Couldn’t load this conversation</p><p className={s.blankText}>{error}</p><Button variant="secondary" size="md" onClick={reload}>Try again</Button></div></div>
  }
  const t = data.thread
  const onSend = async (body: string) => {
    const r = await sendReply(id, body, admin)
    if (!r.ok || !r.data) { toast.error(r.error || 'Message not sent'); return false }
    setPending(p => [...p, r.data!])
    reload()
    return true
  }
  const toggle = async () => {
    const r = await setThreadStatus(id, t.status === 'open' ? 'closed' : 'open', admin)
    if (!r.ok) { toast.error(r.error || 'Couldn’t update the conversation'); return }
    toast.success(t.status === 'open' ? 'Marked as resolved' : 'Conversation reopened')
    reload()
  }

  let lastDay = ''
  return (
    <div className={s.convo}>
      <div className={s.convoHead}>
        <span className={s.backBtn}><IconButton icon="chevronLeft" label="All conversations" size="md" onClick={onBack} /></span>
        <div className={s.convoTitleWrap}>
          <h2 className={s.convoTitle}>{t.subject}</h2>
          <p className={s.convoSub}>
            {admin && t.user ? <>{t.user.full_name || t.user.email}{t.user.full_name && t.user.email ? ` · ${t.user.email}` : ''} · </> : null}
            {t.order_ref ? <>Order {t.order_ref} · </> : null}
            {t.audience === 'partner' ? 'Partner · ' : ''}
            Started {fmtDate(t.created_at)}
          </p>
        </div>
        {(admin || t.status === 'open') && (
          <Button variant="secondary" size="sm" icon={t.status === 'open' ? 'check' : undefined} onClick={toggle}>
            {t.status === 'open' ? 'Resolve' : 'Reopen'}
          </Button>
        )}
      </div>
      <div className={s.stream} ref={stream} aria-live="polite">
        {messages.map((m, i) => {
          const day = dayOf(m.created_at)
          const showDay = day !== lastDay
          lastDay = day
          const prev = messages[i - 1]
          return (
            <div key={m.id} className={s.msgWrap}>
              {showDay && <div className={s.day}><span>{day}</span></div>}
              <Bubble m={m} mode={mode} showLabel={!prev || prev.sender !== m.sender || showDay} />
            </div>
          )
        })}
        {t.status === 'closed' && <div className={s.day}><span>{admin ? 'Resolved. A reply reopens it.' : 'Marked as resolved. Reply to reopen it.'}</span></div>}
      </div>
      <Composer onSend={onSend} placeholder={admin ? 'Reply to the customer' : 'Write a reply'} />
    </div>
  )
}

// ── New conversation ─────────────────────────────────────────

function NewThread({ audience, orderRef, onCancel, onCreated, orders }: {
  audience: SupportAudience; orderRef: string; onCancel: () => void; onCreated: (t: SupportThread) => void
  orders?: { ref: string; label: string }[]
}) {
  const [subject, setSubject] = useState(orderRef ? `Help with order ${orderRef}` : '')
  const [order, setOrder] = useState(orderRef)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) { setError('Add a subject'); return }
    if (!body.trim()) { setError('Write a message'); return }
    setBusy(true); setError('')
    const r = await openThread({ subject: subject.trim(), body: body.trim(), audience, order_ref: order || undefined })
    setBusy(false)
    if (!r.ok || !r.data) { setError(r.error || 'Couldn’t send your message'); return }
    toast.success('Message sent. We’ll reply here.')
    onCreated(r.data)
  }
  return (
    <div className={s.convo}>
      <div className={s.convoHead}>
        <span className={s.backBtn}><IconButton icon="chevronLeft" label="All conversations" size="md" onClick={onCancel} /></span>
        <div className={s.convoTitleWrap}>
          <h2 className={s.convoTitle}>New conversation</h2>
          <p className={s.convoSub}>{audience === 'partner' ? 'Questions about payouts, links or your account.' : 'Questions about an order, a login or your account.'}</p>
        </div>
      </div>
      <form className={s.newForm} onSubmit={submit}>
        <Field label="Subject">{p => <Input {...p} value={subject} maxLength={140} onChange={e => setSubject(e.target.value)} placeholder="What do you need help with?" autoFocus />}</Field>
        {orders && orders.length > 0 && (
          <Field label="Related order" hint="Optional">
            {p => (
              <select {...p} className={s.select} value={order} onChange={e => setOrder(e.target.value)}>
                <option value="">None</option>
                {orders.map(o => <option key={o.ref} value={o.ref}>{o.label}</option>)}
              </select>
            )}
          </Field>
        )}
        <Field label="Message" error={error || undefined}>
          {p => <Textarea {...p} rows={6} value={body} maxLength={4000} onChange={e => setBody(e.target.value)} placeholder="Tell us what happened. Include what you see on screen if something isn’t working." />}
        </Field>
        <div className={s.newActions}>
          <Button type="submit" loading={busy}>Send message</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

// ── Inbox ────────────────────────────────────────────────────

export function SupportInbox({ mode, audience = 'customer', threads, loading, error, onRetry, orders, toolbar }: {
  mode: Mode
  audience?: SupportAudience
  threads: SupportThread[] | undefined
  loading: boolean
  error: string
  onRetry: () => void
  orders?: { ref: string; label: string }[]
  toolbar?: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const selected = params.get('t')
  const composing = mode === 'user' && (params.get('new') === '1' || !!params.get('order'))
  const orderRef = (params.get('order') || '').toUpperCase()

  const go = (q: Record<string, string>) => {
    const next = new URLSearchParams(q).toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  const list = threads || []
  const hasRight = !!selected || composing

  return (
    <div className={`${s.inbox} ${hasRight ? s.inboxOpen : ''}`}>
      <div className={s.listPane}>
        <div className={s.listHead}>
          {toolbar ?? <span className={s.listTitle}>Conversations</span>}
          {mode === 'user' && <Button size="sm" icon="plus" onClick={() => go({ new: '1' })}>New</Button>}
        </div>
        {loading && !threads ? <ListSkeleton />
          : error ? (
            <div className={s.blank}><p className={s.blankTitle}>Couldn’t load conversations</p><p className={s.blankText}>{error}</p><Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button></div>
          ) : list.length === 0 ? (
            <div className={s.blank}>
              <p className={s.blankTitle}>{mode === 'admin' ? 'Nothing here' : 'No conversations yet'}</p>
              <p className={s.blankText}>{mode === 'admin' ? 'Conversations customers and partners start will show here.' : 'Message us about an order, a login or your account. We reply here and let you know in your notifications.'}</p>
            </div>
          ) : (
            <ul className={s.list}>
              {list.map(t => <ThreadItem key={t.id} t={t} mode={mode} active={t.id === selected} onOpen={() => go({ t: t.id })} />)}
            </ul>
          )}
      </div>
      <div className={s.rightPane}>
        {composing ? (
          <NewThread audience={audience} orderRef={orderRef} orders={orders} onCancel={() => go({})} onCreated={t => go({ t: t.id })} />
        ) : selected ? (
          <Conversation key={selected} id={selected} mode={mode} onBack={() => go({})} />
        ) : (
          <div className={s.blank} style={{ margin: 'auto' }}>
            <span className={s.blankIcon}><Icon name="message" size={20} /></span>
            <p className={s.blankTitle}>{mode === 'admin' ? 'Pick a conversation' : 'How can we help?'}</p>
            <p className={s.blankText}>
              {mode === 'admin' ? 'Replies reach the customer’s notifications straight away.' : 'Start a conversation and our team will reply here, usually within a few hours.'}
            </p>
            {mode === 'user' && <Button size="md" icon="plus" onClick={() => go({ new: '1' })}>New conversation</Button>}
          </div>
        )}
      </div>
    </div>
  )
}

