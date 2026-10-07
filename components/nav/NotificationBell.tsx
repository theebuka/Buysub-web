'use client'

// Header bell for signed-in users: the latest notifications, unread first
// marked with a dot. Opening an item marks it read. Full list at
// /account/notifications.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon, IconButton, Popover, Skeleton } from '@/components/ui'
import { useInbox, markInboxRead, KIND_ICON, type InboxItem } from '@/lib/inbox'
import { fmtRelative } from '@/lib/format'
import { ROUTES } from '@/lib/routes'
import css from './nav.module.css'

function Item({ n, close }: { n: InboxItem; close: () => void }) {
  const router = useRouter()
  const open = () => {
    close()
    if (!n.read_at) markInboxRead([n.id])
    if (n.href) router.push(n.href)
  }
  return (
    <button type="button" data-menu-item className={css.inboxItem} onClick={open}>
      <span className={css.inboxIcon}><Icon name={KIND_ICON[n.kind] || 'bell'} size={16} /></span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className={css.inboxTitle}>{n.title}</span>
        {n.body && <span className={css.inboxBody}>{n.body}</span>}
        <span className={css.inboxTime}>{fmtRelative(n.created_at)}</span>
      </span>
      {!n.read_at && <span className={css.unreadDot} aria-label="Unread" />}
    </button>
  )
}

export function NotificationBell() {
  const { data, loading } = useInbox(true)
  const unread = data?.unread ?? 0
  const items = (data?.items || []).slice(0, 6)
  return (
    <Popover
      align="end"
      width="min(440px, calc(100vw - 24px))"
      panelLabel="Notifications"
      trigger={({ toggle, props }) => <IconButton icon="bell" label="Notifications" count={unread} onClick={toggle} {...props} />}
    >
      {close => (
        <div>
          <div className={css.inboxHead}>
            <span className={css.inboxHeading}>Notifications</span>
            {unread > 0 && <button type="button" className={css.inboxAction} onClick={() => markInboxRead()}>Mark all read</button>}
          </div>
          {loading && !data ? (
            <div style={{ display: 'grid', gap: 8, padding: 'var(--bs-space-3)' }}><Skeleton height={40} /><Skeleton height={40} /></div>
          ) : items.length === 0 ? (
            <p className={css.inboxEmpty}>Nothing yet. Order updates and reminders will show here.</p>
          ) : (
            <div className={css.inboxList}>{items.map(n => <Item key={n.id} n={n} close={close} />)}</div>
          )}
          <Link href={ROUTES.account.notifications} className={css.inboxAll} onClick={close} data-menu-item>See all notifications</Link>
        </div>
      )}
    </Popover>
  )
}
