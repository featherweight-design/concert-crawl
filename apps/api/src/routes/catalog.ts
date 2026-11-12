import { Hono } from 'hono';
import { auditLog, crawlRuns, db } from '@concert-crawl/db';
import { max } from 'drizzle-orm';

export const catalogRouter = new Hono();

// The data generation stamp for the web's shared catalog cache (caching skill,
// section 3). It is derived, never stored: the newest crawl run or admin action,
// whichever is later. A crawl or an admin edit moves it, so every cached catalog
// read keyed on it retires on its own, with no list of what to invalidate and no
// dependence on a revalidate call having fired. Moving when nothing user-visible
// changed (a skipped crawl, an unrelated admin action) only costs a refetch.
//
// Public and tiny. `Cache-Control` matches the web's own 60 s read of it; the
// answer carries no personal data, so a shared cache may hold it.
catalogRouter.get('/generation', async (ctx) => {
  const [[crawl], [audit]] = await Promise.all([
    db.select({ latest: max(crawlRuns.createdAt) }).from(crawlRuns),
    db.select({ latest: max(auditLog.createdAt) }).from(auditLog),
  ]);
  const stamps = [crawl?.latest, audit?.latest].flatMap((value) =>
    value ? [value.getTime()] : [],
  );
  const generation = stamps.length > 0 ? String(Math.max(...stamps)) : '0';
  ctx.header('Cache-Control', 'public, max-age=60');
  return ctx.json({ success: true, data: { generation } });
});
