import { ButtonLink, Card, Icon, PageHeader, WhatsAppGlyph, type IconName } from '@/components/ui'
import { ROUTES, EXTERNAL } from '@/lib/routes'
import { WHATSAPP_NUMBER } from '@/lib/constants'
import s from './help.module.css'

export const metadata = {
  title: 'Help centre · BuySub',
  description: 'Get help with an order, payment or your account.',
}

const TOPICS: { icon: IconName; title: string; text: string; href: string; cta: string; external?: boolean }[] = [
  { icon: 'receipt', title: 'Track an order', text: 'See the status of every order you’ve placed, and its reference.', href: ROUTES.account.orders, cta: 'View my orders' },
  { icon: 'wallet', title: 'Wallet and refunds', text: 'Check your wallet balance and transaction history.', href: ROUTES.account.wallet, cta: 'Open wallet' },
  { icon: 'user', title: 'Account and sign in', text: 'Reset your password or update your name and phone number.', href: ROUTES.login, cta: 'Go to sign in' },
  { icon: 'users', title: 'Partner programme', text: 'Earn commission on every subscription you refer.', href: ROUTES.partner.programme, cta: 'Learn more' },
  { icon: 'help', title: 'Frequently asked questions', text: 'Delivery, payment and renewal questions, answered.', href: EXTERNAL.faq, cta: 'Read the FAQs', external: true },
  { icon: 'message', title: 'Contact form', text: 'Not urgent? Send us a message and we’ll reply by email.', href: EXTERNAL.contact, cta: 'Send a message', external: true },
]

export default function HelpPage() {
  const wa = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hi BuySub, I need help with ')}`
  return (
    <div className={s.page}>
      <PageHeader
        crumbs={[{ label: 'Shop', href: ROUTES.shop }, { label: 'Help centre' }]}
        title="How can we help?"
        description="Most questions are answered fastest on WhatsApp. Have your order reference ready if it’s about an order."
      />

      <Card className={s.hero}>
        <div className={s.heroIcon}><WhatsAppGlyph size={24} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className={s.heroTitle}>Chat with us on WhatsApp</h2>
          <p className={s.heroText}>Orders, payments, delivery and renewals. You can also use the chat bubble on this page.</p>
        </div>
        <ButtonLink href={wa} external iconRight="external">Start a chat</ButtonLink>
      </Card>

      <div className={s.grid}>
        {TOPICS.map(t => (
          <Card key={t.title} className={s.topic}>
            <span className={s.topicIcon}><Icon name={t.icon} size={20} /></span>
            <h3 className={s.topicTitle}>{t.title}</h3>
            <p className={s.topicText}>{t.text}</p>
            <ButtonLink href={t.href} external={t.external} variant="secondary" size="md" iconRight={t.external ? 'external' : 'arrowRight'}>
              {t.cta}
            </ButtonLink>
          </Card>
        ))}
      </div>
    </div>
  )
}
