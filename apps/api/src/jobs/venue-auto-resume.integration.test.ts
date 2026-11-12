import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { auditLog, venues } from '@concert-crawl/db';
import { clearTables, seedVenue } from '../test/helpers/seed.js';
import { testDb } from '../test/helpers/db.js';
import { addDays, denverDate } from '../routes/admin/lib/needs-you/keys.js';
import {
  runVenueAutoResume,
  VENUE_AUTO_RESUME_ACTION,
} from './venue-auto-resume.js';

const now = new Date();
const today = denverDate(now);
const pausedAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

const stateOf = async (venueId: string) => {
  const [row] = await testDb
    .select({
      crawlPausedAt: venues.crawlPausedAt,
      reason: venues.crawlPauseReason,
      note: venues.crawlPauseNote,
      resumeOn: venues.crawlResumeOn,
    })
    .from(venues)
    .where(eq(venues.id, venueId));
  return row;
};

describe('runVenueAutoResume', () => {
  beforeEach(async () => {
    await clearTables();
  });

  it('resumes a venue whose date is today or past, clears its pause details and audits it', async () => {
    const dueToday = await seedVenue({
      name: 'Due Today',
      slug: 'due-today',
      crawlPausedAt: pausedAt,
      crawlPauseReason: 'waiting_on_permission',
      crawlPauseNote: 'Waiting on a reply',
      crawlResumeOn: today,
    });
    const overdue = await seedVenue({
      name: 'Overdue',
      slug: 'overdue',
      crawlPausedAt: pausedAt,
      crawlPauseReason: 'site_broken_or_moved',
      crawlResumeOn: addDays(today, -3),
    });

    const { resumed } = await runVenueAutoResume(now);

    expect(resumed.map((venue) => venue.venueId).sort()).toEqual(
      [dueToday.id, overdue.id].sort(),
    );
    expect(await stateOf(dueToday.id)).toEqual({
      crawlPausedAt: null,
      reason: null,
      note: null,
      resumeOn: null,
    });
    const audits = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.action, VENUE_AUTO_RESUME_ACTION));
    expect(audits).toHaveLength(2);
    const forDueToday = audits.find((row) => row.targetId === dueToday.id);
    expect(forDueToday?.actorId).toBe('system:vercel-cron');
    expect(forDueToday?.metadata).toMatchObject({
      reason: 'waiting_on_permission',
      note: 'Waiting on a reply',
      resumeOn: today,
    });
  });

  it('leaves a future date, a pause with no date and a crawler auto-pause alone', async () => {
    const future = await seedVenue({
      name: 'Future',
      slug: 'future',
      crawlPausedAt: pausedAt,
      crawlPauseReason: 'other',
      crawlPauseNote: 'later',
      crawlResumeOn: addDays(today, 3),
    });
    const noDate = await seedVenue({
      name: 'No Date',
      slug: 'no-date',
      crawlPausedAt: pausedAt,
      crawlPauseReason: 'waiting_on_permission',
    });
    const autoPaused = await seedVenue({
      name: 'Auto Paused',
      slug: 'auto-paused',
      crawlPausedAt: pausedAt,
      consecutiveFailures: 3,
    });

    const { resumed } = await runVenueAutoResume(now);

    expect(resumed).toEqual([]);
    for (const venue of [future, noDate, autoPaused]) {
      expect((await stateOf(venue.id))?.crawlPausedAt).not.toBeNull();
    }
    expect(
      await testDb
        .select()
        .from(auditLog)
        .where(eq(auditLog.action, VENUE_AUTO_RESUME_ACTION)),
    ).toHaveLength(0);
  });

  it('does nothing for a venue that is not paused, even with a stale date', async () => {
    const venue = await seedVenue({
      name: 'Not Paused',
      slug: 'not-paused',
      crawlResumeOn: addDays(today, -1),
    });
    const { resumed } = await runVenueAutoResume(now);
    expect(resumed).toEqual([]);
    expect((await stateOf(venue.id))?.resumeOn).toBe(addDays(today, -1));
  });
});
