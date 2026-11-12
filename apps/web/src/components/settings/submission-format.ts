import type { UserSubmissionItem } from '@concert-crawl/types';

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
  const diff = Date.now() - new Date(iso).getTime();
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
