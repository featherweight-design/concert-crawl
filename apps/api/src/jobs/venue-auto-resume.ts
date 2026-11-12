// Resume venues whose admin-set resume date has come. Runs from Vercel Cron
// shortly before the 3 AM Mountain daily crawl (vercel.json), so a venue paused
// "until Nov 16" is crawled again in the early hours of Nov 16.
//
// Only venues an admin paused with a date are touched: a crawler auto-pause
// (three failures) and a removal have no resume date and stay paused.

import { and, inArray, isNotNull, isNull, lte } from 'drizzle-orm';
import { auditLog, db, venues } from '@concert-crawl/db';
import { denverDate } from '../routes/admin/lib/needs-you/keys.js';

// The audit_log actor for an action no person took.
const RESUME_ACTOR = 'system:vercel-cron';

export const VENUE_AUTO_RESUME_ACTION = 'venue.crawl_auto_resumed';

export interface ResumedVenue {
  venueId: string;
  resumeOn: string;
}

export const runVenueAutoResume = async (
  now: Date,
): Promise<{ resumed: ResumedVenue[] }> => {
  const today = denverDate(now);
  const resumed = await db.transaction(async (tx) => {
    // Locked so an admin resuming or re-pausing the same venue by hand cannot
    // interleave: the audit names the pause this job actually removed.
    const due = await tx
      .select({
        id: venues.id,
        crawlPausedAt: venues.crawlPausedAt,
        reason: venues.crawlPauseReason,
        note: venues.crawlPauseNote,
        resumeOn: venues.crawlResumeOn,
      })
      .from(venues)
      .where(
        and(
          isNotNull(venues.crawlPausedAt),
          isNotNull(venues.crawlResumeOn),
          lte(venues.crawlResumeOn, today),
          // Belt and braces: the removal also clears the date, but a removed
          // venue must never be crawled again by any path.
          isNull(venues.removedAt),
        ),
      )
      .for('update');
    if (due.length === 0) return [];

    await tx
      .update(venues)
      .set({
        crawlPausedAt: null,
        crawlPauseReason: null,
        crawlPauseNote: null,
        crawlResumeOn: null,
      })
      .where(
        inArray(
          venues.id,
          due.map((venue) => venue.id),
        ),
      );
    await tx.insert(auditLog).values(
      due.map((venue) => ({
        actorId: RESUME_ACTOR,
        action: VENUE_AUTO_RESUME_ACTION,
        targetId: venue.id,
        metadata: {
          pausedSince: venue.crawlPausedAt?.toISOString() ?? null,
          reason: venue.reason,
          note: venue.note,
          resumeOn: venue.resumeOn,
        },
      })),
    );
    return due.flatMap((venue) =>
      venue.resumeOn === null
        ? []
        : [{ venueId: venue.id, resumeOn: venue.resumeOn }],
    );
  });
  return { resumed };
};
