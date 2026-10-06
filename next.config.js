/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // In-app URLs for pages that still live on the Framer site (buysub.ng).
  // Temporary (307) so they can become real pages later without browsers
  // having cached the hop.
  async redirects() {
    return [
      { source: '/privacy', destination: 'https://buysub.ng/privacy-policy', permanent: false },
      { source: '/contact', destination: 'https://buysub.ng/contact', permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.logo.dev' },
      { protocol: 'https', hostname: '*.airtableusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

module.exports = nextConfig;
