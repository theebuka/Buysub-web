'use client'

// Messages from BuySub: delivery details for what you bought (logins,
// activation codes), so the body is shown verbatim with a copy button.
// List and reader side by side on desktop; one at a time on phones, with
// ?m=<id> as the open message so Back works.

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Icon, IconButton, ProductLogo, copyText } from '@/components/ui'
import { toast } from 'sonner'
import { useApi, invalidate } from '@/lib/useApi'
import { authFetch } from '@/lib/apiAuth'
import { fmtDate, fmtDateTime, fmtRelative } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from './AccountShell'
import s from './account.module.css'
import { markedRead } from './readState'

// Shown as read as soon as it's opened, without waiting for the refetch.
const isRead = (m: { id: string; is_read: boolean }) => m.is_read || markedRead.has(m.id)

type Msg = {
  id: string; subject: string; product_name: string | null; product_domain: string | null
  body: string; is_read: boolean; created_at: string; expires_at: string | null
}

function Reader({ m, onBack }: { m: Msg; onBack: () => void }) {
  const expired = m.expires_at && new Date(m.expires_at).getTime() < Date.now()
  return (
    <article className={s.reader} aria-labelledby="msg-title">
      <button type="button" className={`${s.back} bs-mobile-only`} onClick={onBack} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
        <Icon name="chevronLeft" size={14} /> All messages
      </button>
      <div style={{ display: 'flex', gap: 'var(--bs-space-3)', alignItems: 'flex-start' }}>
        {m.product_domain && <ProductLogo product={{ name: m.product_name || m.subject, domain: m.product_domain }} size={40} radius="var(--bs-radius-md)" />}
        <div style={{ minWidth: 0 }}>
          <h2 id="msg-title" className={s.readerTitle}>{m.subject}</h2>
          <p className={s.muted} style={{ marginTop: 4 }}>
            {[m.product_name, fmtDateTime(m.created_at)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className={s.body}>
        {m.body}
        <span className={s.copyBtn}>
          <IconButton icon="copy" label="Copy message" size="md" onClick={async () => {
            if (await copyText(m.body)) toast.success('Copied'); else toast.error('Couldn’t copy. Select the text instead.')
          }} />
        </span>
      </div>
      {m.expires_at && (
        <p className={`${s.muted} ${expired ? s.warn : ''}`}>
          {expired ? `These details expired on ${fmtDate(m.expires_at)}.` : `These details are valid until ${fmtDate(m.expires_at)}.`}
        </p>
      )}
      <p className={s.muted}>Keep login details private. BuySub will never ask for your password.</p>
    </article>
  )
}

export default function Messages() {
  const router = useRouter()
  const params = useSearchParams()
  const { data, error, loading, reload } = useApi<Msg[]>('/v2/me/messages')
  const list = data || []
  const openId = params.get('m') || ''
  const open = list.find(m => m.id === openId) || null

  const select = (id: string | null) =>
    router.replace(id ? `${ROUTES.account.messages}?m=${encodeURIComponent(id)}` : ROUTES.account.messages, { scroll: false })

  // On desktop, show the newest message rather than an empty reader.
  useEffect(() => {
    if (!openId && list.length && window.matchMedia('(min-width: 900px)').matches) select(list[0].id)
  }, [openId, list.length]) // select is stable enough: it only reads router

  // Opening marks it read, once per message per page load; the list, the nav
  // count and the overview then refresh in place.
  useEffect(() => {
    if (!open || open.is_read || markedRead.has(open.id)) return
    markedRead.add(open.id)
    authFetch(`/v2/me/messages/${open.id}/read`, { method: 'PATCH', redirectOnAuth: false })
      .then(() => invalidate('/v2/me/messages'))
  }, [open?.id, open?.is_read])

  return (
    <>
      <PageHead title="Messages" lede="Delivery details and updates from BuySub." />
      <div className={s.panel}>
        {loading ? <RowsSkeleton n={4} />
          : error ? <PanelError message={error} onRetry={reload} />
          : !list.length ? <PanelEmpty title="No messages yet">When we deliver a subscription, the login or activation details arrive here.</PanelEmpty>
          : (
            <div className={`${s.mail} ${open ? s.mailHasOpen : s.mailNoOpen}`}>
              <ul className={s.mailList} aria-label="Messages">
                {list.map(m => (
                  <li key={m.id}>
                    <button type="button" className={`${s.msgItem} ${isRead(m) ? '' : s.unread}`} aria-current={m.id === openId ? 'true' : undefined} onClick={() => select(m.id)}>
                      {isRead(m) ? <span style={{ width: 6, flexShrink: 0 }} /> : <><span className={s.unreadDot} aria-hidden="true" /><span className="sr-only">Unread: </span></>}
                      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span className={s.msgSubject}>{m.subject}</span>
                        <span className={s.rowSub}>{[m.product_name, fmtRelative(m.created_at)].filter(Boolean).join(' · ')}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {open ? <Reader m={open} onBack={() => select(null)} /> : <div className={s.reader}><p className={s.secondary}>Select a message to read it.</p></div>}
            </div>
          )}
      </div>
    </>
  )
}
