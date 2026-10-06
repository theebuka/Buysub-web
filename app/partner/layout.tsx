import PartnerShell from '@/components/partner/PartnerShell'

export const metadata = { title: 'Partner portal · BuySub' }

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <PartnerShell>{children}</PartnerShell>
}
