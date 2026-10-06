import { redirect } from 'next/navigation';

// Reading searchParams makes this route dynamic, and Cloudflare Pages
// (next-on-pages) requires every dynamic route to run on the edge runtime.
export const runtime = 'edge';

// Keep the query string: referral links (?ref=CODE) land here, and
// useReferral on /shop reads ?ref= from the URL.
export default function Home({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (Array.isArray(v)) v.forEach(x => qs.append(k, x));
    else if (v !== undefined) qs.set(k, v);
  }
  const query = qs.toString();
  redirect(query ? `/shop?${query}` : '/shop');
}
