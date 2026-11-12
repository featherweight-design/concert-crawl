import { and, eq, inArray } from 'drizzle-orm';
import { db, events } from '@concert-crawl/db';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Hide events from every consumer listing (`hidden: true`, "Mark non-concert")
 * or show them again. Scoped to rows not already in the target state, so only
 * a real transition bumps `updated_at`. Returns the ids that changed.
 */
export const setHiddenFromConsumer = async (
  tx: Tx,
  ids: string[],
  hidden: boolean,
): Promise<string[]> => {
  const updated = await tx
    .update(events)
    .set({ hiddenFromConsumer: hidden, updatedAt: new Date() })
    .where(and(inArray(events.id, ids), eq(events.hiddenFromConsumer, !hidden)))
    .returning({ id: events.id });
  return updated.map((row) => row.id);
};

/** Approve an event (verified = true). Returns the row, or null if missing. */
export const verifyEvent = async (id: string) => {
  const [updated] = await db
    .update(events)
    .set({ verified: true, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  return updated ?? null;
};
