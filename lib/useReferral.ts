// ============================================================
// useReferral hook — Affiliate referral tracking
// File: ~/Downloads/buysub-web/lib/useReferral.ts
//
// Usage in shop page:
//   import { useReferral } from '@/lib/useReferral'
//   const { referralCode, affiliateInfo, clearReferral } = useReferral()
//   // Pass referralCode to order payload at checkout
// ============================================================

'use client'

import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_BASE || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'
const COOKIE_NAME = 'bs_ref'
const COOKIE_DAYS = 30

interface AffiliateInfo {
  affiliate_id: string
  referral_code: string
  store_name: string
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[2]) : null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
}

export function useReferral() {
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [affiliateInfo, setAffiliateInfo] = useState<AffiliateInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // 1. Check URL for ?ref= parameter
      const params = new URLSearchParams(window.location.search)
      const urlRef = params.get('ref')?.trim().toUpperCase()

      // 2. Check existing cookie
      const cookieRef = getCookie(COOKIE_NAME)

      // URL ref takes priority over cookie
      const code = urlRef || cookieRef

      if (!code) {
        setLoading(false)
        return
      }

      // 3. Validate the code against the API
      try {
        const res = await fetch(`${API}/v2/affiliates/resolve?code=${encodeURIComponent(code)}`)
        const data = await res.json()

        if (data.ok && data.data?.valid) {
          const info: AffiliateInfo = {
            affiliate_id: data.data.affiliate_id,
            referral_code: data.data.referral_code,
            store_name: data.data.store_name,
          }
          setReferralCode(info.referral_code)
          setAffiliateInfo(info)

          // Save/refresh the cookie
          setCookie(COOKIE_NAME, info.referral_code, COOKIE_DAYS)

          // Track the click (only if it came from the URL, not a cookie)
          if (urlRef) {
            fetch(`${API}/v2/affiliates/click`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referral_code: info.referral_code,
                landing_url: window.location.href,
                referrer: document.referrer || null,
              }),
            }).catch(() => {}) // non-critical
          }

          // Clean the URL (remove ?ref= so it looks normal)
          if (urlRef) {
            params.delete('ref')
            const newUrl = params.toString()
              ? `${window.location.pathname}?${params.toString()}`
              : window.location.pathname
            window.history.replaceState({}, '', newUrl)
          }
        } else {
          // Invalid code — clear cookie if it existed
          if (cookieRef) deleteCookie(COOKIE_NAME)
        }
      } catch {
        // API error — keep existing cookie if valid
        if (cookieRef) {
          setReferralCode(cookieRef)
        }
      }

      setLoading(false)
    }

    init()
  }, [])

  const clearReferral = () => {
    deleteCookie(COOKIE_NAME)
    setReferralCode(null)
    setAffiliateInfo(null)
  }

  return { referralCode, affiliateInfo, loading, clearReferral }
}