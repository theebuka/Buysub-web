import AccountShell from '@/components/account/AccountShell'

export const metadata = { title: 'Your account · BuySub' }

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>
}
