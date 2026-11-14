// The keep-warm ping. A Vercel cron (apps/web/vercel.json) GETs this every 5
// minutes so the web function stays warm between visits: Next bundles every
// route into one function here, so warming this route warms /events too.
//
// It must never wake the database: Hugh declined paying to keep Neon awake,
// so this imports nothing that reads data or calls Clerk, and
// `__tests__/route.test.ts` fails if it ever does.

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return new Response('ok', { headers: { 'cache-control': 'no-store' } });
}
