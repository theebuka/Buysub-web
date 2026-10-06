'use client'

import { useEffect } from 'react'
import { Button, ButtonLink, EmptyState } from '@/components/ui'
import { ROUTES } from '@/lib/routes'

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <EmptyState
        icon="alert"
        title="Something went wrong"
        action={
          <div style={{ display: 'flex', gap: 'var(--bs-space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button icon="arrowRight" onClick={reset}>Try again</Button>
            <ButtonLink href={ROUTES.help} variant="secondary" icon="help">Contact support</ButtonLink>
          </div>
        }
      >
        This page hit an error. Trying again usually works. If it keeps happening, tell us what you were doing
        {error.digest ? <> and quote reference <code>{error.digest}</code></> : null}.
      </EmptyState>
    </div>
  )
}
