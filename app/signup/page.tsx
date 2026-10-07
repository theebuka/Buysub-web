// /signup: create a customer account. Partners apply at /partners.
import AuthPage from '@/components/auth/AuthPage'

export const metadata = { title: 'Create an account · BuySub' }

export default function Page() {
  return <AuthPage initialMode="signup" />
}
