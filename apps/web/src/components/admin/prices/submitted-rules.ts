import { isSafeHttpUrl } from '@/lib/is-safe-http-url';

export type SubmissionState =
  'waiting' | 'published' | 'price-check' | 'not-used' | 'stale';

export type StateFilter = 'all' | 'waiting' | 'published' | 'price-check';

export const STATE_FILTERS: readonly StateFilter[] = [
  'all',
  'waiting',
  'published',
  'price-check',
];

export const REJECTION_REASONS = [
  'wrong-show',
  'wrong-amount',
  'resale',
  'fees-included',
  'other',
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

export const isRejectionReason = (value: unknown): value is RejectionReason =>
  REJECTION_REASONS.some((known) => known === value);

export const isSubmissionState = (value: unknown): value is SubmissionState =>
  value === 'waiting' ||
  value === 'published' ||
  value === 'price-check' ||
  value === 'not-used' ||
  value === 'stale';

/**
 * The words a row's state reads in: a waiting price that isn't the admin's to
 * decide yet (it waits on fans or the Needs you window) reads Pending, not
 * Waiting for you.
 */
export const stateWords = <Words extends Record<SubmissionState, string>>(
  row: { state: SubmissionState; forYou: boolean },
  words: Words & { pending: string },
): string =>
  row.state === 'waiting' && !row.forYou ? words.pending : words[row.state];

/**
 * "axs.com" from a safe ticket URL (`43/approve-menu-d`'s Open ticket hint);
 * null for none or one that isn't http(s).
 */
export const ticketHost = (url: string | null): string | null => {
  if (!isSafeHttpUrl(url)) return null;
  return new URL(url).hostname.replace(/^www\./, '');
};

export type BackedTone = 'green' | 'amber' | 'red';

/** The "Backed by" pill: fans behind the price, or red when it is a Price check. */
export const backedPill = (
  backedBy: number,
  state: SubmissionState,
): { tone: BackedTone; fans: number | null } =>
  state === 'price-check'
    ? { tone: 'red', fans: null }
    : { tone: backedBy >= 2 ? 'green' : 'amber', fans: backedBy };
