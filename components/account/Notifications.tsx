'use client'

// /account/notifications: everything the bell shows, newest first.

import Link from 'next/link'
import { Button, Icon } from '@/components/ui'
import { useInbox, markInboxRead, KIND_ICON, type InboxItem } from '@/lib/inbox'
import { fmtDateTime } from '@/lib/format'
import { PageHead, PanelEmpty, PanelError, RowsSkeleton } from './AccountShell'
import s from './account.module.css'

function Row({ n }: { n: InboxItem }) {
  const body = (
    <>
      <span className={s.inboxIcon}><Icon name={KIND_ICON[n.kind] || 'bell'} size={16} /></span>
      <div className={s.rowMain}>
        <span className={s.rowTitle} style={{ whiteSpace: 'normal', fontWeight: n.read_at ? 500 : 600 }}>{n.title}</span>
        {n.body && <span className={s.secondary}>{n.body}</span>}
        <span className={s.rowSub}>{fmtDateTime(n.created_at)}</span>
      </div>
      {!n.read_at && <span className={s.unreadDot} aria-label="Unread" />}
    </>
  )
  const onOpen = () => { if (!n.read_at) markInboxRead([n.id]) }
  return (
    <li>
      {n.href
        ? <Link href={n.href} className={s.row} style={{ alignItems: 'flex-start' }} onClick={onOpen}>{body}</Link>
        : <div className={s.row} style={{ alignItems: 'flex-start' }}>{body}</div>}
    </li>
  )
}

export default function Notifications() {
  const { data, error, loading, reload } = useInbox(true)
  const unread = data?.unread ?? 0
  return (
    <>
      <PageHead
        title="Notifications"
        lede="Order updates, renewal reminders and wallet activity."
        actions={unread > 0 ? <Button variant="secondary" size="md" icon="check" onClick={() => markInboxRead()}>Mark all read</Button> : undefined}
      />
      <div className={s.panel}>
        {loading && !data ? <RowsSkeleton n={4} />
          : error ? <PanelError message={error} onRetry={reload} />
          : !data?.items.length ? <PanelEmpty title="No notifications yet">We’ll let you know here when an order is confirmed, a plan is about to end, or your wallet changes.</PanelEmpty>
          : <ul className={s.rows}>{data.items.map(n => <Row key={n.id} n={n} />)}</ul>}
      </div>
    </>
  )
}
