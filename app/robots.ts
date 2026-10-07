import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'

// Private and transactional pages stay out of search. '/partner$' and
// '/partner/' block the portal without blocking the /partners landing page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin', '/account', '/dashboard', '/partner$', '/partner/', '/partners/dashboard',
        '/cart', '/checkout', '/order/', '/login', '/reset-password', '/saved',
      ],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
