// /login: one sign-in for customers, partners and staff. The account's role
// decides where it lands. Renders without the app shell (AppShell isNoShell).
import AuthPage from '@/components/auth/AuthPage'

export const metadata = { title: 'Sign in · BuySub' }

export default function Page() {
  return <AuthPage initialMode="login" />
}
