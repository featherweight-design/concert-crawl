import { and, isNotNull, lte, sql } from 'drizzle-orm';
import { crawlRunPages, db } from '@concert-crawl/db';
import { createLogger } from '@concert-crawl/logger';

const logger = createLogger('page-body-sweep');

export interface PageBodySweepResult {
  /** Bodies nulled because their retention window had passed. */
  expired: number;
  /** Bodies still stored after the sweep, and their gzipped size in bytes. */
  remainingBodies: number;
  remainingBytes: number;
}

/**
 * Null the stored body of every crawl-run page whose retention window has
 * passed. The row stays (its URL, status and hash are the run's history); only
 * the gzipped body goes. Idempotent, and a no-op while body storage has never
 * been turned on. It also logs how much is stored, which is how the storage
 * cost of turning CRAWL_PAGE_BODIES on is measured.
 */
export async function sweepExpiredPageBodies(
  now: Date = new Date(),
): Promise<PageBodySweepResult> {
  const expired = await db
    .update(crawlRunPages)
    .set({ htmlGz: null })
    .where(
      and(
        isNotNull(crawlRunPages.htmlGz),
        isNotNull(crawlRunPages.bodyExpiresAt),
        lte(crawlRunPages.bodyExpiresAt, now),
      ),
    )
    .returning({ id: crawlRunPages.id });

  const [remaining] = await db
    .select({
      bodies: sql<number>`count(*)::int`,
      bytes:
        sql<number>`coalesce(sum(pg_column_size(${crawlRunPages.htmlGz})), 0)::bigint`.mapWith(
          Number,
        ),
    })
    .from(crawlRunPages)
    .where(isNotNull(crawlRunPages.htmlGz));

  const result: PageBodySweepResult = {
    expired: expired.length,
    remainingBodies: remaining?.bodies ?? 0,
    remainingBytes: remaining?.bytes ?? 0,
  };
  logger.info(result, 'Page body sweep complete');
  return result;
}
