// ============================================================
// BUYSUB — Session access for surfaces without their own client
// ============================================================
// Supabase access tokens last an hour. The hand-rolled localStorage readers
// treated an expired access token as "logged out" and deleted the stored
// session, which also threw away the refresh token, so staff and customers
// were signed out every hour. getSession() refreshes an expired token instead.

'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    )
  }
  return client
}

/** A valid access token (refreshed if needed), or '' when signed out. */
export async function getAccessToken(): Promise<string> {
  try {
    const { data } = await getClient().auth.getSession()
    return data.session?.access_token || ''
  } catch {
    return ''
  }
}
