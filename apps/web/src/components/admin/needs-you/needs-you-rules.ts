/**
 * The Needs you queue's pure rules: which pill a kind belongs to, the time word
 * on a card, and the card's lines. No React, so the rules are unit-tested.
 */
import type { NeedsYouCount, NeedsYouKind } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { Kind } from '@/components/admin/primitives/KindLabel';
import type { QueueRow } from './needs-you-api';

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

/** The card's meta line: "Globe Hall · Thu Nov 12". */
export const metaOf = (row: QueueRow): string =>
  [row.venueName, row.fanDate ? metaDate(row.fanDate) : null]
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
 * The counts after an answer: one fewer decision of its kind, one more handled
 * today.
 */
export const countAfterRemoval = (
  count: NeedsYouCount,
  kind: NeedsYouKind,
): NeedsYouCount => ({
  decisions: Math.max(0, count.decisions - 1),
  handledToday: count.handledToday + 1,
  byKind: { ...count.byKind, [kind]: Math.max(0, count.byKind[kind] - 1) },
});
