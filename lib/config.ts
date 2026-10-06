// ============================================================
// BUYSUB — API base URL (the one place it is decided)
// ============================================================
// There are two env var names for the same value. Files used to read one or
// the other, and the set that read NEXT_PUBLIC_API_BASE fell back to the live
// API whenever only NEXT_PUBLIC_API_URL was set (as in .env.example), so local
// and staging runs sent half their traffic to production.
//
// API_BASE comes first because the fixture workflow sets it; API_URL is next
// because it is the one declared in .env.example. The literal stays last, so a
// deployment with neither set keeps today's behaviour. Each var must be read
// as a literal process.env.NEXT_PUBLIC_* expression for Next to inline it.
export const API_BASE: string = (
  process.env.NEXT_PUBLIC_API_BASE
  || process.env.NEXT_PUBLIC_API_URL
  || 'https://buysub-api-v2.ebuka-nwaju.workers.dev'
).replace(/\/+$/, '')
