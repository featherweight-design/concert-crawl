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

/** "44" for 44.00, "44.50" for 44.5: dollars the way the board draws them. */
const dollars = (value: string): string => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
};

/** "$44", or "$35–$65" when the price runs to a higher top. */
export const priceRange = (min: string, max: string | null): string =>
  max !== null && Number(max) > Number(min)
    ? `${dollars(min)}–${dollars(max)}`
    : dollars(min);

export type BackedTone = 'green' | 'amber' | 'red';

/** The "Backed by" pill: fans behind the price, or red when it is a Price check. */
export const backedPill = (
  backedBy: number,
  state: SubmissionState,
): { tone: BackedTone; fans: number | null } =>
  state === 'price-check'
    ? { tone: 'red', fans: null }
    : { tone: backedBy >= 2 ? 'green' : 'amber', fans: backedBy };
