import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, venues } from '@concert-crawl/db';
import { addDays, denverDate } from './needs-you/keys.js';

// Why an admin paused a venue (the drawn Pause panel's WHY list). Off-season is
// deliberately not here: Hugh has not ruled whether it is a pause reason or a
// snooze, and nothing stores a season.
export const PAUSE_REASONS = [
  'waiting_on_permission',
  'site_broken_or_moved',
  'other',
] as const;
export type PauseReason = (typeof PAUSE_REASONS)[number];

const MAX_RESUME_DAYS = 366;

const resumeSchema = z.discriminatedUnion('mode', [
  // "When I say": waits for an admin.
  z.object({ mode: z.literal('manual') }),
  // "In 2 weeks" and any other whole number of days from today.
  z.object({
    mode: z.literal('in_days'),
    days: z.number().int().min(1).max(MAX_RESUME_DAYS),
  }),
  // "Pick a date": a Mountain Time calendar date.
  z.object({
    mode: z.literal('on'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
]);

// The pause body, shared by the admin route and the Needs you pause answers.
// A free-text `reason` from before the reason list existed ("venue asked us to
// stop") still works: it becomes reason `other` with that text as the note.
export const pauseBodySchema = z.preprocess(
  (raw) => {
    if (typeof raw !== 'object' || raw === null || !('reason' in raw)) {
      return raw;
    }
    const { reason } = raw;
    if (
      typeof reason === 'string' &&
      !PAUSE_REASONS.some((known) => known === reason)
    ) {
      return { ...raw, reason: 'other', note: reason };
    }
    return raw;
  },
  z
    .object({
      reason: z.enum(PAUSE_REASONS),
      note: z.string().trim().max(500).optional(),
      resume: resumeSchema.default({ mode: 'manual' }),
    })
    .refine((body) => body.reason !== 'other' || (body.note ?? '') !== '', {
      message: 'Other needs a note',
      path: ['note'],
    }),
);
export type PauseBody = z.infer<typeof pauseBodySchema>;

export interface PauseDetails {
  reason: PauseReason;
  note: string | null;
  /** Mountain Time calendar date the venue resumes on, null for "When I say". */
  resumeOn: string | null;
}

export type PauseDetailsResult =
  { ok: true; details: PauseDetails } | { ok: false; error: string };

/** Turn a validated pause body into stored details, checking the date. */
export const resolvePauseDetails = (
  body: PauseBody,
  now: Date,
): PauseDetailsResult => {
  const today = denverDate(now);
  let resumeOn: string | null = null;
  if (body.resume.mode === 'in_days') {
    resumeOn = addDays(today, body.resume.days);
  } else if (body.resume.mode === 'on') {
    const { date } = body.resume;
    // Round-trips, so 2026-02-30 (which Date.parse rolls to Mar 2) is refused.
    const parsed = new Date(`${date}T00:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      return { ok: false, error: 'That is not a date' };
    }
    if (date <= today) {
      return { ok: false, error: 'Pick a date after today' };
    }
    if (date > addDays(today, MAX_RESUME_DAYS)) {
      return { ok: false, error: 'Pick a date within a year' };
    }
    resumeOn = date;
  }
  return {
    ok: true,
    details: { reason: body.reason, note: body.note || null, resumeOn },
  };
};

/**
 * Stop every crawl of a venue while its shows stay published. Idempotent:
 * pausing a paused venue keeps the original timestamp, and takes the new
 * reason, note and resume date (an admin editing the pause). Returns null when
 * the venue does not exist.
 *
 * The row lock makes overlapping pauses serialize, so the second one sees the
 * first's timestamp instead of overwriting it.
 */
export const pauseVenueCrawl = async (
  id: string,
  details: PauseDetails,
  pausedBy: string | null,
) =>
  db.transaction(async (tx) => {
    const [existing] = await tx
      .select({
        crawlPausedAt: venues.crawlPausedAt,
        removedAt: venues.removedAt,
      })
      .from(venues)
      .where(eq(venues.id, id))
      .for('update');
    if (!existing) return null;
    const [updated] = await tx
      .update(venues)
      .set({
        crawlPausedAt: existing.crawlPausedAt ?? new Date(),
        // Who paused it first: pausing again to edit the reason keeps the original.
        ...(existing.crawlPausedAt === null ? { crawlPausedBy: pausedBy } : {}),
        crawlPauseReason: details.reason,
        crawlPauseNote: details.note,
        // A removed venue never resumes by itself.
        crawlResumeOn: existing.removedAt === null ? details.resumeOn : null,
      })
      .where(eq(venues.id, id))
      .returning();
    return { existing, venue: updated };
  });
