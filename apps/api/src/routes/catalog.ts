import { Hono } from 'hono';
import { auditLog, crawlRuns, db, priceSubmissions } from '@concert-crawl/db';
import { max } from 'drizzle-orm';

export const catalogRouter = new Hono();

// The data generation stamp for the web's shared catalog cache (caching skill,
// section 3). It is derived, never stored: the newest crawl run, admin action or
// community price submission, whichever is later. A crawl or an admin edit moves it, so every cached catalog
// read keyed on it retires on its own, with no list of what to invalidate and no
// dependence on a revalidate call having fired. Moving when nothing user-visible
// changed (a skipped crawl, an unrelated admin action) only costs a refetch.
//
// Public and tiny, no personal data. `no-store`: the web reads it through its own
// 60 s cache, and a second cache window here would stack staleness to two
// minutes. A run row is inserted when a venue's crawl finishes, after its events
// are written, so a read that sees the new stamp sees the new events.
catalogRouter.get('/generation', async (ctx) => {
  const [[crawl], [audit], [price]] = await Promise.all([
    db.select({ latest: max(crawlRuns.createdAt) }).from(crawlRuns),
    db.select({ latest: max(auditLog.createdAt) }).from(auditLog),
    db
      .select({ latest: max(priceSubmissions.createdAt) })
      .from(priceSubmissions),
  ]);
  const stamps = [crawl?.latest, audit?.latest, price?.latest].flatMap(
    (value) => (value ? [value.getTime()] : []),
  );
  const generation = stamps.length > 0 ? String(Math.max(...stamps)) : '0';
  ctx.header('Cache-Control', 'no-store');
  return ctx.json({ success: true, data: { generation } });
});
