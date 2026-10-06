'use client'

// Site-wide cart drawer. Mounted once by SiteHeader; opened with
// setCartDrawer(true) from the header, "Add to cart" and anywhere else.

import { ButtonLink, Drawer, DrawerBody, IconButton } from '@/components/ui'
import { useCart, useCartDrawer, setCartDrawer, cartCount } from '@/lib/cart'
import { CartEmpty, CartLines, Totals } from './CartContents'
import s from './shop.module.css'

export default function CartDrawer() {
  const open = useCartDrawer()
  const cart = useCart()
  const n = cartCount(cart)
  const close = () => setCartDrawer(false)

  // No close-on-pathname-change: closing a quick view (history.back) changes
  // the pathname right after "Add to cart" opens this drawer. Every link
  // inside the drawer closes it itself instead.

  return (
    <Drawer open={open} onClose={close} side="right" label="Cart">
      <div className={s.drawerHead}>
        <h2 className={s.drawerTitle}>Cart{n ? <span className={s.muted}> · {n} item{n === 1 ? '' : 's'}</span> : null}</h2>
        <IconButton icon="close" label="Close cart" onClick={close} />
      </div>
      <DrawerBody>
        {n === 0 ? <CartEmpty onBrowse={close} /> : <div className={s.drawerPad}><CartLines onNavigate={close} /></div>}
      </DrawerBody>
      {n > 0 && (
        <div className={s.drawerFoot}>
          <Totals />
          <ButtonLink href="/checkout" size="xl" full iconRight="arrowRight" onClick={close}>Checkout</ButtonLink>
          <ButtonLink href="/cart" variant="ghost" full size="md" onClick={close}>View full cart</ButtonLink>
        </div>
      )}
    </Drawer>
  )
}
