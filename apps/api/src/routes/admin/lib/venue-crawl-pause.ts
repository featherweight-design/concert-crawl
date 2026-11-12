import { eq } from 'drizzle-orm';
import { db, venues } from '@concert-crawl/db';

/**
 * Stop every crawl of a venue while its shows stay published. Idempotent:
 * pausing a paused venue keeps the original timestamp. Returns null when the
 * venue does not exist.
 *
 * The row lock makes overlapping pauses serialize, so the second one sees the
 * first's timestamp instead of overwriting it.
 */
export const pauseVenueCrawl = async (id: string) =>
  db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ crawlPausedAt: venues.crawlPausedAt })
      .from(venues)
      .where(eq(venues.id, id))
      .for('update');
    if (!existing) return null;
    const [updated] = await tx
      .update(venues)
      .set({ crawlPausedAt: existing.crawlPausedAt ?? new Date() })
      .where(eq(venues.id, id))
      .returning();
    return { existing, venue: updated };
  });
