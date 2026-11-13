/**
 * The Needs you queue's pure rules: which pill a kind belongs to, the time word
 * on a card, and the card's lines. No React, so the rules are unit-tested.
 */
import type { NeedsYouCount, NeedsYouKind } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { Kind } from '@/components/admin/primitives/KindLabel';
import type { AnswerParams, QueueRow } from './needs-you-api';

const COPY = ADMIN_COPY.needsYou;

export type FilterKey =
  'all' | 'shows' | 'venues' | 'artists' | 'prices' | 'bugs';

export const FILTERS: readonly FilterKey[] = [
  'all',
  'shows',
  'venues',
  'artists',
  'prices',
  'bugs',
];

/** `07/kind-labels`: the pill a kind is counted under. */
const KIND_FILTER: Record<NeedsYouKind, Exclude<FilterKey, 'all'>> = {
  'show-dropped': 'shows',
  'show-moved': 'shows',
  'event-low-confidence': 'shows',
  'venue-failing': 'venues',
  'venue-blocked': 'venues',
  artist: 'artists',
  'price-check': 'prices',
  'price-batch': 'prices',
  bug: 'bugs',
};

/** The small-caps label a kind wears (rule 8). */
const KIND_LABEL: Record<NeedsYouKind, Kind> = {
  'show-dropped': 'show',
  'show-moved': 'show',
  'event-low-confidence': 'event',
  'venue-failing': 'venue',
  'venue-blocked': 'venue',
  artist: 'artist',
  'price-check': 'priceCheck',
  'price-batch': 'prices',
  bug: 'bug',
};

export const kindLabelOf = (kind: NeedsYouKind): Kind => KIND_LABEL[kind];

/** A blocked venue is drawn urgent (red); every other kind keeps its tone. */
export const isUrgent = (kind: NeedsYouKind): boolean =>
  kind === 'venue-blocked';

export const inFilter = (row: QueueRow, filter: FilterKey): boolean =>
  filter === 'all' || KIND_FILTER[row.kind] === filter;

/** The count on a pill. Server counts describe the whole queue, whatever the filter. */
export const filterCount = (
  count: NeedsYouCount,
  filter: FilterKey,
): number => {
  if (filter === 'all') return count.decisions;
  let total = 0;
  for (const kind of Object.keys(KIND_FILTER)) {
    if (isKind(kind) && KIND_FILTER[kind] === filter)
      total += count.byKind[kind];
  }
  return total;
};

const isKind = (value: string): value is NeedsYouKind =>
  Object.hasOwn(KIND_FILTER, value);

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` as a UTC day number, so date arithmetic ignores the clock. */
const dayNumber = (date: string): number =>
  Date.parse(`${date}T00:00:00Z`) / DAY_MS;

/** Today's date in Mountain Time, `YYYY-MM-DD`. */
export const mountainToday = (now: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

/**
 * The time word on a card (addendum 3): Today, Tomorrow, "In N days" up to 13,
 * then the date ("Sat, Nov 28"). Soon means Today or Tomorrow, drawn pink. An
 * item with no date has no word.
 */
export const whenOf = (
  fanDate: string | null,
  today: string,
): { word: string; soon: boolean } | null => {
  if (!fanDate) return null;
  const days = Math.round(dayNumber(fanDate) - dayNumber(today));
  if (days <= 0) return { word: COPY.when.today, soon: true };
  if (days === 1) return { word: COPY.when.tomorrow, soon: true };
  if (days <= 13) return { word: COPY.when.inDays(days), soon: false };
  return {
    word: new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${fanDate}T00:00:00Z`)),
    soon: false,
  };
};

/** "Thu Nov 12", the date in a card's meta line. */
export const metaDate = (fanDate: string): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(new Date(`${fanDate}T00:00:00Z`))
    .replace(',', '');

/**
 * "8 PM" or "7:30 PM" from a stored `HH:MM:SS` show time (venue-local, so no
 * zone to convert). Null for no time or one that does not parse.
 */
export const metaTime = (
  showTime: string | null | undefined,
): string | null => {
  const match = /^(\d{2}):(\d{2})/.exec(showTime ?? '');
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2];
  if (hour > 23) return null;
  const clock = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return minute === '00'
    ? `${clock} ${suffix}`
    : `${clock}:${minute} ${suffix}`;
};

/** The card's meta line: "Globe Hall · Thu Nov 12 · 8 PM". */
export const metaOf = (row: QueueRow): string =>
  [
    row.venueName,
    row.fanDate ? metaDate(row.fanDate) : null,
    metaTime(row.showTime),
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

const ISO_DATE = /^(\d{4}-\d{2}-\d{2})(?:T|$)/;

/**
 * An evidence line's value as the queue says it: an ISO date as "Thu Nov 12",
 * an artist's match status in words, anything else as the API sent it.
 */
export const evidenceText = (label: string, value: string): string => {
  if (label === 'Match status') return COPY.matchStatus(value);
  const date = ISO_DATE.exec(value)?.[1];
  return date ? metaDate(date) : value;
};

const evidenceValue = (row: QueueRow, label: string): string | null => {
  const value = row.evidence.find((line) => line.label === label)?.value;
  return value === undefined ? null : evidenceText(label, value);
};

/** The right-hand figure on a card's top line. */
export const impactOf = (row: QueueRow): string => {
  if (row.kind === 'price-batch') return COPY.batch;
  if (row.kind === 'event-low-confidence') return COPY.hiddenUntilDecided;
  if (row.kind === 'artist' && row.reportCount !== null && row.reportCount > 0)
    return COPY.reports(row.reportCount);
  if (row.watchers > 0) return COPY.watching(row.watchers);
  return COPY.noFanImpact;
};

/** The card's "what happened" line, built from the item's evidence. */
export const whatOf = (row: QueueRow): string => {
  const what = COPY.what;
  switch (row.kind) {
    case 'show-dropped':
      return what.showDropped(row.venueName, evidenceValue(row, 'Last seen'));
    case 'show-moved':
      return what.showMoved(evidenceValue(row, 'At'));
    case 'venue-failing':
      return what.venueFailing(evidenceValue(row, 'Consecutive failures'));
    case 'venue-blocked':
      return what.venueBlocked(evidenceValue(row, 'HTTP status'));
    case 'artist':
      return what.artist(
        evidenceValue(row, 'Match status'),
        evidenceValue(row, 'Open reports'),
      );
    case 'event-low-confidence':
      return what.eventLowConfidence(evidenceValue(row, 'Confidence'));
    case 'price-check':
      return what.priceCheck(
        evidenceValue(row, 'Listed price'),
        evidenceValue(row, 'Checked price'),
      );
    case 'price-batch':
      return what.priceBatch(evidenceValue(row, 'Submissions'));
    case 'bug':
      return what.bug(evidenceValue(row, 'Page'));
  }
};

/**
 * The answers a card offers: the suggested one first, at most three (addendum
 * 3). The panel offers them all. Navigation-only answers stay on the panel.
 */
export const cardAnswers = (row: QueueRow) =>
  [...row.answers]
    .sort((left, right) => Number(right.suggested) - Number(left.suggested))
    .slice(0, 3);

/**
 * Answers that open the item instead of writing: the API refuses them (400),
 * so the queue opens the item's panel for them (2c draws what they lead to).
 */
export const NAVIGATION_SLUGS: ReadonlySet<string> = new Set([
  'edit_then_list',
  'review',
]);

/**
 * The fields an answer always carries. A price check's two answers take a
 * reason the boards do not draw a field for, so the queue records where the
 * call was made; every other answer takes none by default.
 */
export const defaultParams = (slug: string): AnswerParams | undefined =>
  slug === 'use_checked_price' || slug === 'keep_listed_price'
    ? { reason: COPY.priceCheckReason }
    : undefined;

const SNOOZE_HOUR = 8;

/**
 * 8 AM Mountain on `date` (`YYYY-MM-DD`), as an ISO instant with the offset
 * Mountain Time has that day (-07:00 in winter, -06:00 in summer), so a snooze
 * returns at the drawn "tomorrow at 8 AM" whatever the viewer's own zone.
 */
export const eightAmMountain = (date: string): string => {
  const offsets = ['-07:00', '-06:00'];
  for (const offset of offsets) {
    const instant = `${date}T0${SNOOZE_HOUR}:00:00${offset}`;
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date(instant));
    if (Number(hour) === SNOOZE_HOUR) return instant;
  }
  return `${date}T0${SNOOZE_HOUR}:00:00${offsets[0]}`;
};

/** `YYYY-MM-DD`, `days` after Mountain Time's today. */
export const mountainDayAhead = (now: Date, days: number): string => {
  const today = mountainToday(now);
  return new Date(dayNumber(today) * DAY_MS + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
};

/** "Wed, Nov 18": a snooze's return day in the menu. */
export const snoozeDayLabel = (date: string): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));

/**
 * The counts after an answer: one fewer decision of its kind, one more handled
 * today. A snooze leaves `handledToday` alone (nothing was decided).
 */
export const countAfterRemoval = (
  count: NeedsYouCount,
  kind: NeedsYouKind,
  handled: boolean,
): NeedsYouCount => ({
  decisions: Math.max(0, count.decisions - 1),
  handledToday: count.handledToday + (handled ? 1 : 0),
  byKind: { ...count.byKind, [kind]: Math.max(0, count.byKind[kind] - 1) },
});

/** The card's headline name for an answered line: the title up to " w/ ". */
export const answeredName = (title: string): string =>
  title.split(' w/ ')[0] ?? title;

// ---------------------------------------------------------------------------
// The evidence panel's drawn layouts (02/show-dropped, show-moved, venue-*)
// ---------------------------------------------------------------------------

const PANEL = COPY.panel;

const mountainParts = (iso: string) => {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
  }).formatToParts(instant);
  const pick = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    period: pick('dayPeriod').toUpperCase(),
  };
};

/** "Nov 11", an instant's Mountain Time day. Null when it does not parse. */
export const mountainDay = (iso: string): string | null => {
  const parts = mountainParts(iso);
  return parts ? `${parts.month} ${parts.day}` : null;
};

/** "Nov 9, 3 AM" or "Nov 9, 3:02 AM", an instant in Mountain Time. */
export const mountainStamp = (iso: string): string | null => {
  const parts = mountainParts(iso);
  if (!parts) return null;
  const clock =
    parts.minute === '00' ? parts.hour : `${parts.hour}:${parts.minute}`;
  return `${parts.month} ${parts.day}, ${clock} ${parts.period}`;
};

/** The days from `today` to `fanDate`, or null when there is no date. */
const daysUntil = (fanDate: string | null, today: string): number | null =>
  fanDate ? Math.round(dayNumber(fanDate) - dayNumber(today)) : null;

/** The chip under a show panel's title: "Tomorrow · Thu Nov 12". */
export const whenChipOf = (
  fanDate: string | null,
  today: string,
): { text: string; soon: boolean } | null => {
  const when = whenOf(fanDate, today);
  const days = daysUntil(fanDate, today);
  if (!when || !fanDate || days === null) return null;
  const date = metaDate(fanDate);
  return days > 13
    ? { text: date, soon: false }
    : { text: `${when.word} · ${date}`, soon: when.soon };
};

/** "tomorrow", "in 3 days" or "Sat Nov 28": how the sentence says the date. */
export const whenWord = (fanDate: string, today: string): string => {
  const days = daysUntil(fanDate, today) ?? 0;
  if (days <= 0) return COPY.when.today.toLowerCase();
  if (days === 1) return COPY.when.tomorrow.toLowerCase();
  if (days <= 13) return COPY.when.inDays(days).toLowerCase();
  return metaDate(fanDate);
};

/** WHO SEES IT on a dropped show. */
export const whoSeesDropped = (
  row: QueueRow,
  today: string,
  ranksFirst: boolean,
): string => {
  const watching = PANEL.showDropped.watchers(row.watchers);
  // The chip above already says when; the sentence earns its place only for
  // the show that ranks first.
  if (!row.fanDate || !ranksFirst) return watching;
  return `${watching} ${PANEL.showDropped.itsWhen(whenWord(row.fanDate, today))}`;
};

/** WHAT HAPPENED on a dropped show. */
export const droppedWhat = (row: QueueRow): string => {
  const seen = row.lastSeenAt
    ? mountainDay(row.lastSeenAt)
    : evidenceValue(row, 'Last seen');
  return PANEL.showDropped.wasOn(answeredName(row.title), row.venueName, seen);
};

/** The date in a moved show's "Looks like" line ("<title> on 2026-11-14"). */
export const lookalikeDate = (row: QueueRow): string | null => {
  const value = row.evidence.find((line) => line.label === 'Looks like')?.value;
  const date = value ? /\son (\d{4}-\d{2}-\d{2})$/.exec(value)?.[1] : undefined;
  return date ? metaDate(date) : null;
};

/** The failed-crawl count on a failing venue, or null. */
export const failuresOf = (row: QueueRow): number | null => {
  const count = Number(
    row.evidence.find((line) => line.label === 'Consecutive failures')?.value,
  );
  return Number.isInteger(count) && count > 0 ? count : null;
};

/** "Nov 11 at 3:02 AM": when a venue's newest run happened, or null. */
export const latestRunWhen = (
  row: Pick<QueueRow, 'lastRuns'>,
): string | null => {
  const [latest] = [...row.lastRuns].sort(
    (left, right) => Date.parse(right.at) - Date.parse(left.at),
  );
  return latest
    ? (mountainStamp(latest.at)?.replace(', ', ' at ') ?? null)
    : null;
};

/** The recorded robots.txt result in words, or null when none or unchecked. */
export const robotsText = (robots: string | null): string | null => {
  if (robots === 'yes') return PANEL.venue.robotsResult.yes;
  if (robots === 'no') return PANEL.venue.robotsResult.no;
  return null;
};

/** The HTTP status on a blocked venue ("429"), or null. */
export const httpStatusOf = (row: QueueRow): string | null =>
  row.evidence.find((line) => line.label === 'HTTP status')?.value ?? null;

const STATUS_NAMES: Record<string, string> = {
  '403': '403 Forbidden',
  '429': '429 Too Many Requests',
};

/** "429 Too Many Requests", or "HTTP 418" for a status with no name here. */
export const statusPhrase = (status: string): string =>
  STATUS_NAMES[status] ?? `HTTP ${status}`;

/** The panel's title, as the board draws it for each of the four kinds. */
/** "$29", "$45.50": a price from the API's numeric string, or null. */
export const priceText = (value: string | null): string | null => {
  const amount = Number(value);
  if (value === null || !Number.isFinite(amount)) return null;
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
};

/** "$29–$64", "$44", or "$45+" for a price with no top end. */
export const priceRangeOf = (
  min: string | null,
  max: string | null,
): string | null => {
  const low = priceText(min);
  if (low === null) return null;
  const high = priceText(max);
  if (high === null) return `${low}+`;
  return high === low ? low : `${low}–${high}`;
};

/** A ticket tier as the board writes it: "GA", "VIP". */
export const tierWord = (tier: string | null): string | null =>
  tier ? tier.replace(/_/g, ' ').toUpperCase() : null;

/** "Sep 18" for a submission instant, in Mountain Time. */
export const priceDay = (iso: string | null): string | null =>
  iso ? mountainDay(iso) : null;

/** "Today, 9:14 AM" for an instant on `today`, else "Nov 12, 9:14 AM". */
export const todayStamp = (
  iso: string | null,
  today: string,
): string | null => {
  if (!iso) return null;
  const stamp = mountainStamp(iso);
  if (!stamp) return null;
  const day = mountainDay(iso);
  const sameDay = day !== null && day === mountainDay(`${today}T18:00:00Z`);
  return sameDay
    ? stamp.replace(`${day},`, `${PANEL.priceCheck.today},`)
    : stamp;
};

/** Minutes since `iso`, or null when it does not parse. */
export const minutesSince = (
  iso: string | null,
  nowMs: number,
): number | null => {
  const then = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(then)
    ? Math.max(0, Math.round((nowMs - then) / 60000))
    : null;
};

/** A path from a page URL ("/events/abc"), or what was sent when it is not one. */
export const pagePathOf = (pageUrl: string): string => {
  try {
    const url = new URL(pageUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return pageUrl;
  }
};

export const panelTitleOf = (row: QueueRow): string => {
  switch (row.kind) {
    case 'artist': {
      const reasons = row.artistFacts?.reportReasons ?? [];
      return row.reportCount &&
        reasons.length === 1 &&
        reasons[0] === 'wrong_photo'
        ? PANEL.artist.title(row.reportCount, row.title)
        : row.title;
    }
    case 'event-low-confidence':
      return PANEL.event.title(row.title);
    case 'price-check': {
      const facts = row.priceFacts;
      const price = facts
        ? priceRangeOf(facts.checked, facts.checkedMax)
        : null;
      if (!facts || price === null) return row.title;
      return facts.checkedMax === null
        ? PANEL.priceCheck.titleStarts(row.title, tierWord(facts.tier), price)
        : PANEL.priceCheck.titleIs(row.title, tierWord(facts.tier), price);
    }
    case 'bug':
      return `“${row.title}”`;
    case 'show-dropped':
      return PANEL.showDropped.title(answeredName(row.title), row.venueName);
    case 'show-moved':
      return row.moveTo?.venueName
        ? PANEL.showMoved.title(answeredName(row.title), row.moveTo.venueName)
        : row.title;
    case 'venue-failing':
      return PANEL.venue.failingTitle(row.venueName, failuresOf(row));
    case 'venue-blocked':
      return PANEL.venue.blockedTitle(row.venueName);
    default:
      return row.title;
  }
};

/** LIKELY CAUSE: a sentence for the error class, or what the API sent. */
export const causeText = (cause: string): string => {
  const known = Object.entries(PANEL.venue.cause).find(
    ([key]) => key === cause,
  );
  return known ? known[1] : cause;
};

/** The word a run's status wears. */
export const runStatusWord = (status: string): string => {
  switch (status) {
    case 'failed':
      return PANEL.runStatus.failed;
    case 'success':
      return PANEL.runStatus.ok;
    case 'partial':
      return PANEL.runStatus.partial;
    case 'skipped':
      return PANEL.runStatus.skipped;
    default:
      return status;
  }
};

/** The last four runs, newest first, each with its Mountain Time day. */
export const lastRunsOf = (
  row: Pick<QueueRow, 'lastRuns'>,
): { day: string; status: string; ok: boolean; detail: string | null }[] =>
  [...row.lastRuns]
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
    .slice(0, 4)
    .flatMap((run) => {
      const day = mountainDay(run.at);
      return day
        ? [
            {
              day,
              status: runStatusWord(run.status),
              ok: run.status === 'success',
              // A failed run says why; an OK one says how many shows it found.
              detail:
                run.errorMessage ??
                (run.status === 'success' && run.eventsFound !== null
                  ? PANEL.venue.runShows(run.eventsFound)
                  : null),
            },
          ]
        : [];
    });

/** The suggested answer first, the others in the API's order. */
export const leadFirst = (row: Pick<QueueRow, 'answers'>) =>
  [...row.answers].sort(
    (left, right) => Number(right.suggested) - Number(left.suggested),
  );
