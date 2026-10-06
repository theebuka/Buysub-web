'use client'

import { ButtonLink, Card, PageHeader } from '@/components/ui'
import { useCart, cartCount } from '@/lib/cart'
import { CartEmpty, CartLines, Notice, Totals, useCartReconcile } from './CartContents'
import { useEffect, useState } from 'react'
import s from './shop.module.css'

export default function CartPage() {
  const cart = useCart()
  const [mounted, setMounted] = useState(false)
  const [msg, clearMsg] = useCartReconcile()
  useEffect(() => setMounted(true), [])
  const n = mounted ? cartCount(cart) : 0

  return (
    <div className={s.page}>
      <PageHeader crumbs={[{ label: 'Shop', href: '/shop' }, { label: 'Cart' }]} title="Your cart" />
      {msg && <Notice tone="warn" onClose={clearMsg}>{msg}</Notice>}
      {!mounted ? null : n === 0 ? <CartEmpty /> : (
        <div className={s.twoCol}>
          <Card><CartLines /></Card>
          <Card className={s.sticky}>
            <Totals />
            <ButtonLink href="/checkout" size="xl" full iconRight="arrowRight">Checkout</ButtonLink>
            <ButtonLink href="/shop" variant="ghost" full size="md">Continue shopping</ButtonLink>
          </Card>
        </div>
      )}
    </div>
  )
}
