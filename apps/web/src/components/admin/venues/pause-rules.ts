import type {
  CrawlPauseReason,
  CrawlPauseRequest,
  CrawlPauseResume,
  Venue,
  VenueWithEventCount,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  AUTO_PAUSE_FAILURES,
  deriveVenueStatusChips,
} from '@/lib/admin/venue-status';
import { DENVER_TIME_ZONE, formatISODate } from '@/lib/time';

/**
 * The Pause panel's RESUME chips (`A3/03/pause-panel-d`). "In 2 weeks" is 14
 * days from today; "Pick a date" opens the month calendar in place.
 */
export type ResumeChoice = 'manual' | 'twoWeeks' | 'date';
export const RESUME_CHOICES: readonly ResumeChoice[] = [
  'manual',
  'twoWeeks',
  'date',
];
export const TWO_WEEKS = 14;
/** The API's limit on a resume date (`MAX_RESUME_DAYS`). */
export const MAX_RESUME_DAYS = 366;

/** The drawn WHY radios. Off-season is HOLD (Hugh top 1; no API reason). */
export const PAUSE_REASONS: readonly CrawlPauseReason[] = [
  'waiting_on_permission',
  'site_broken_or_moved',
  'other',
];

/** `YYYY-MM-DD` plus whole days, on the calendar (no time zone involved). */
export const addDays = (date: string, days: number): string => {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
};

/** A resume date the API takes: after today, within a year. */
export const isPickable = (date: string, today: string): boolean =>
  date > today && date <= addDays(today, MAX_RESUME_DAYS);

/** The date the venue resumes on, for the result line; null for "When I say". */
export const resumeDate = (
  choice: ResumeChoice,
  picked: string | null,
  today: string,
): string | null => {
  if (choice === 'twoWeeks') return addDays(today, TWO_WEEKS);
  if (choice === 'date') return picked;
  return null;
};

/**
 * The full pause body, or null while the form can't be sent: Other needs a
 * note, and Pick a date needs a date.
 */
export const buildPauseBody = (
  reason: CrawlPauseReason,
  note: string,
  choice: ResumeChoice,
  picked: string | null,
): CrawlPauseRequest | null => {
  let resume: CrawlPauseResume;
  if (choice === 'manual') resume = { mode: 'manual' };
  else if (choice === 'twoWeeks') resume = { mode: 'in_days', days: TWO_WEEKS };
  else if (picked === null) return null;
  else resume = { mode: 'on', date: picked };

  const trimmed = note.trim();
  if (reason === 'other') {
    return trimmed === '' ? null : { reason, note: trimmed, resume };
  }
  return { reason, resume };
};

/** One month of the calendar: null pads the days before the 1st (S first). */
export const monthGrid = (month: string): Array<string | null> => {
  const first = new Date(`${month}-01T00:00:00Z`);
  const lead: null[] = Array.from({ length: first.getUTCDay() }, () => null);
  const days: string[] = [];
  for (let day = first; day.getUTCMonth() === first.getUTCMonth();) {
    days.push(day.toISOString().slice(0, 10));
    day = new Date(day.getTime() + 86_400_000);
  }
  return [...lead, ...days];
};

/** `YYYY-MM` moved by whole months. */
export const shiftMonth = (month: string, by: number): string => {
  const at = new Date(`${month}-01T00:00:00Z`);
  at.setUTCMonth(at.getUTCMonth() + by);
  return at.toISOString().slice(0, 7);
};

const PAUSE_LINE = ADMIN_COPY.venueDetailsClient.dangerZone.crawlPause;

export type PausedVenue = Pick<
  Venue,
  | 'crawlPausedAt'
  | 'crawlPauseReason'
  | 'crawlPauseNote'
  | 'consecutiveFailures'
> & { crawlPausedByName?: string | null };

/** The reason as the line says it; an Other note loses its own full stop. */
const reasonText = (venue: PausedVenue): string | null => {
  const reason = venue.crawlPauseReason ?? null;
  if (reason === 'other') {
    return venue.crawlPauseNote?.trim().replace(/\.+$/, '') || null;
  }
  return reason === null ? null : PAUSE_LINE.reasons[reason];
};

/**
 * The paused state line, as the ⋯ menu draws it (`A3/03/venue-menu-states`):
 * "Paused by Hugh, Oct 28: waiting on permission." Null when not paused.
 *
 * An auto-pause is told by its missing reason, not its missing name: every
 * admin pause path requires a reason (`pauseBodySchema`), and the crawler's
 * auto-pause writes none (crawler-core `crawl.ts`), while a name goes missing
 * for other reasons (an admin keeping an auto-pause keeps the crawler as the
 * pauser). It reads "Auto-paused after 3 failures." ("Try a re-crawl first."
 * is HOLD). A reasonless pause under 3 failures is a hand pause from before
 * reasons existed.
 */
export const pausedStateLine = (venue: PausedVenue): string | null => {
  if (venue.crawlPausedAt === null) return null;
  const date = formatISODate(venue.crawlPausedAt, DENVER_TIME_ZONE, {
    month: 'short',
    day: 'numeric',
  });
  const name = venue.crawlPausedByName ?? null;
  const why = reasonText(venue);
  if (why === null && venue.consecutiveFailures >= AUTO_PAUSE_FAILURES) {
    return PAUSE_LINE.autoPaused;
  }
  if (name !== null) return PAUSE_LINE.pausedBy(name, date, why);
  return why === null
    ? PAUSE_LINE.pausedSince(date)
    : PAUSE_LINE.pausedSinceBecause(date, why);
};

/**
 * The form a body was sent from, to reopen the panel on a refused one. With
 * no body, the phone board's defaults (`01/pause-crawling`): Waiting on
 * permission, When I say.
 */
export const formFromBody = (
  body: CrawlPauseRequest | null,
): {
  reason: CrawlPauseReason;
  note: string;
  choice: ResumeChoice;
  picked: string | null;
} => {
  const resume = body?.resume;
  return {
    reason: body?.reason ?? 'waiting_on_permission',
    note: body?.note ?? '',
    choice:
      resume?.mode === 'on'
        ? 'date'
        : resume?.mode === 'in_days'
          ? 'twoWeeks'
          : 'manual',
    picked: resume?.mode === 'on' ? resume.date : null,
  };
};

/** What a pause attempt came back with (see `pauseCrawling`). */
export type PauseOutcome = { ok: true } | { ok: false; error: string | null };

/**
 * Re-crawl is for a live venue we're crawling. Paused and auto-paused venues
 * wait on Resume (orchestrator ruling, bulk too); blocked and robots-disallowed
 * ones are refused by the crawl rules, and the API refuses hidden and
 * unverified venues.
 */
export const canRecrawl = (venue: VenueWithEventCount): boolean => {
  const { onSite, crawling } = deriveVenueStatusChips(venue);
  return onSite === 'live' && crawling === 'crawling' && venue.verified;
};

export interface FanOutResult {
  /** Ids whose action did not land, in the order they were sent. */
  failed: string[];
  /** A refusal of the body itself (a 422 date error), shown in the panel. */
  inlineError: string | null;
}

/**
 * Bulk actions have no endpoint of their own, so each id is sent alone (rule
 * 10 then reports the ones that failed). A thrown call and a refused one both
 * count as failed.
 */
export const fanOut = async (
  ids: readonly string[],
  send: (id: string) => Promise<PauseOutcome>,
): Promise<FanOutResult> => {
  const settled = await Promise.allSettled(ids.map((id) => send(id)));
  const failed: string[] = [];
  let inlineError: string | null = null;
  settled.forEach((result, index) => {
    const id = ids[index];
    if (id === undefined) return;
    if (result.status === 'rejected') {
      failed.push(id);
    } else if (!result.value.ok) {
      failed.push(id);
      inlineError ??= result.value.error;
    }
  });
  return { failed, inlineError };
};
