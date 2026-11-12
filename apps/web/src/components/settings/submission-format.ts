import {
  tallySubmissionCounts,
  type UserSubmissionItem,
} from '@concert-crawl/types';

export const formatPrice = (cents: number): string =>
  `$${Math.round(cents / 100)}`;

/** `$68` for a single price, `$68–$75` for a range. */
export const priceLabelOf = (
  submission: Pick<UserSubmissionItem, 'priceMin' | 'priceMax'>,
): string =>
  submission.priceMax
    ? `${formatPrice(submission.priceMin)}–${formatPrice(submission.priceMax)}`
    : formatPrice(submission.priceMin);

export const formatDate = (iso: string): string => {
  if (!iso) return '';
  const date = new Date(iso + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatAgo = (iso: string): string => {
  // A server stamp a few seconds ahead of this clock is "0m", never "-1m".
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
};

/** The newest submission, whatever order the list arrived in. */
export const latestSubmission = (
  submissions: UserSubmissionItem[],
): UserSubmissionItem | undefined =>
  submissions.reduce<UserSubmissionItem | undefined>(
    (latest, sub) =>
      latest === undefined || sub.submittedAt > latest.submittedAt
        ? sub
        : latest,
    undefined,
  );

/**
 * The page's filters. "Live" is a price that stands (confirmed), "Price
 * checks" is one a fan has queried (the display status `disputed`).
 */
export type SubmissionFilter = 'all' | 'live' | 'pending' | 'priceChecks';

export const SUBMISSION_FILTERS: SubmissionFilter[] = [
  'all',
  'live',
  'pending',
  'priceChecks',
];

const FILTER_STATUS: Record<
  Exclude<SubmissionFilter, 'all'>,
  UserSubmissionItem['status']
> = {
  live: 'confirmed',
  pending: 'pending',
  priceChecks: 'disputed',
};

export const matchesFilter = (
  submission: Pick<UserSubmissionItem, 'status'>,
  filter: SubmissionFilter,
): boolean => filter === 'all' || submission.status === FILTER_STATUS[filter];

export const countsByFilter = (
  submissions: Pick<UserSubmissionItem, 'status'>[],
): Record<SubmissionFilter, number> => {
  // The shared tally (the same one /v1/users/me uses), so the page's chips and
  // every other surface count by one definition. Closed rows (stale, archived)
  // are in `all` and in no filter, so the filters need not sum to All.
  const counts = tallySubmissionCounts(submissions);
  return {
    all: counts.total,
    live: counts.live,
    pending: counts.pending,
    priceChecks: counts.priceChecks,
  };
};

export interface SubmissionMonth {
  /** `YYYY-MM` in Mountain Time, the month the price was submitted. */
  key: string;
  /** The month's full name, e.g. `November`. */
  label: string;
  items: UserSubmissionItem[];
}

const DENVER = 'America/Denver';

const monthKeyOf = (iso: string): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date(iso));
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  return `${year}-${month}`;
};

const monthLabelOf = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', { timeZone: DENVER, month: 'long' }).format(
    new Date(iso),
  );

/**
 * Groups by the month the price was submitted (Mountain Time), newest month
 * first and newest submission first within it, whatever order they arrived in.
 */
export const groupByMonth = (
  submissions: UserSubmissionItem[],
): SubmissionMonth[] => {
  const sorted = [...submissions].sort((left, right) =>
    left.submittedAt < right.submittedAt
      ? 1
      : left.submittedAt > right.submittedAt
        ? -1
        : 0,
  );
  const months: SubmissionMonth[] = [];
  for (const sub of sorted) {
    const key = monthKeyOf(sub.submittedAt);
    const last = months[months.length - 1];
    if (last?.key === key) {
      last.items.push(sub);
    } else {
      months.push({ key, label: monthLabelOf(sub.submittedAt), items: [sub] });
    }
  }
  return months;
};
