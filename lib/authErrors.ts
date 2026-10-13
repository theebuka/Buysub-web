// Supabase Auth answers in developer English ("User already registered",
// "Email rate limit exceeded"). This turns the ones a visitor can reach into
// our own copy, and anything unrecognised into the fallback, so a provider
// message never reaches the page.

type AuthErr = { message?: string; code?: string; status?: number } | null | undefined

const RULES: [RegExp, string][] = [
  [/user_already_exists|email_exists|already (been )?registered|already exists/i,
    'An account with this email already exists. Sign in instead, or reset your password if you’ve forgotten it.'],
  [/email_not_confirmed|not confirmed/i,
    'Confirm your email before signing in. Use the link we sent you.'],
  [/invalid_credentials|invalid login credentials/i,
    'That email and password don’t match an account.'],
  [/over_email_send_rate_limit|over_request_rate_limit|rate limit|security purposes|too many requests/i,
    'Too many attempts. Wait a minute, then try again.'],
  [/same_password|different from the old password/i,
    'Choose a password you haven’t used on this account before.'],
  [/weak_password|password should be|password is too/i,
    'Choose a stronger password, at least 8 characters long.'],
  [/email_address_invalid|email_address_not_authorized|validate email|invalid email|invalid format/i,
    'Enter a valid email address.'],
  [/signup_disabled|signups? not allowed|signups? (are|is) disabled/i,
    'New accounts can’t be created right now. Please try again later.'],
  [/otp_expired|flow_state|code verifier|invalid or has expired|link is invalid|token has expired|access_denied/i,
    'This link is invalid or has expired. Request a new one.'],
  [/session_not_found|session_missing|session missing|refresh_token|not authenticated/i,
    'Your session has ended. Request a new link and try again.'],
  [/failed to fetch|networkerror|network request failed|load failed|fetch failed/i,
    'We couldn’t reach the server. Check your connection and try again.'],
]

export function authMessage(err: AuthErr | string, fallback = 'Something went wrong. Please try again.'): string {
  const text = typeof err === 'string' ? err : `${err?.code ?? ''} ${err?.message ?? ''}`
  for (const [test, message] of RULES) if (test.test(text)) return message
  return fallback
}
