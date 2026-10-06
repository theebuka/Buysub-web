import { ButtonLink, EmptyState } from '@/components/ui'
import { ROUTES } from '@/lib/routes'

export const metadata = { title: 'Page not found · BuySub' }

export default function NotFound() {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <EmptyState
        icon="search"
        title="We couldn’t find that page"
        action={
          <div style={{ display: 'flex', gap: 'var(--bs-space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <ButtonLink href={ROUTES.shop} icon="store">Browse the shop</ButtonLink>
            <ButtonLink href={ROUTES.help} variant="secondary" icon="help">Get help</ButtonLink>
          </div>
        }
      >
        The link may be old or mistyped. Everything we sell is in the shop, and your orders are in your account.
      </EmptyState>
    </div>
  )
}
