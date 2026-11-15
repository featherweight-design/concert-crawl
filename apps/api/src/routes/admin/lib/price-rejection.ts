import { and, eq, sql } from 'drizzle-orm';
import { db, priceSubmissions } from '@concert-crawl/db';
import { encodeRejection, type RejectionReason } from '@concert-crawl/types';

// The encoding lives in @concert-crawl/types, next to `fanStoredStatus`, so
// the admin's view and the fan's read a rejection the same way.
export {
  encodeRejection,
  parseRejection,
  REJECTION_REASONS,
  type Rejection,
  type RejectionReason,
} from '@concert-crawl/types';

export type RejectSubmissionResult =
  | { ok: true; updated: typeof priceSubmissions.$inferSelect }
  | { ok: false }
  | { ok: 'contest_lockout' }
  | { ok: 'not_waiting' };

/**
 * Reject one waiting price (POST /v1/admin/prices/submissions/:id/reject).
 * Only a `pending` price can be rejected: a published one already feeds the
 * show's price, and taking it back is a Price check, not a rejection. A
 * Price check's rows are locked out exactly as in `setSubmissionStatus`.
 */
export const rejectSubmission = async (
  id: string,
  reason: RejectionReason,
  note: string | undefined,
): Promise<RejectSubmissionResult> =>
  db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        status: priceSubmissions.status,
        disputedSubmissionId: priceSubmissions.disputedSubmissionId,
      })
      .from(priceSubmissions)
      .where(eq(priceSubmissions.id, id))
      .limit(1)
      .for('update');
    if (!existing) return { ok: false as const };

    // A counter row, or a price with a pending counter, belongs to a Price
    // check and resolves there.
    if (existing.disputedSubmissionId !== null) {
      return { ok: 'contest_lockout' as const };
    }
    const pendingCounter = await tx
      .select({ id: priceSubmissions.id })
      .from(priceSubmissions)
      .where(
        and(
          eq(priceSubmissions.disputedSubmissionId, id),
          eq(priceSubmissions.status, 'pending'),
        ),
      )
      .limit(1);
    if (pendingCounter.length > 0) return { ok: 'contest_lockout' as const };

    if (existing.status !== 'pending') return { ok: 'not_waiting' as const };

    const [updated] = await tx
      .update(priceSubmissions)
      .set({
        status: 'archived',
        archivedReason: encodeRejection(reason, note),
        heldForAdminAt: null,
        updatedAt: sql`now()`,
      })
      .where(eq(priceSubmissions.id, id))
      .returning();
    return updated ? { ok: true as const, updated } : { ok: false as const };
  });
