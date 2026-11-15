import { ApiError } from '@/lib/api';

/**
 * The 409 codes `POST /v1/admin/crawl/:id` sends a test re-crawl
 * (`{ trial: true }`) it refuses: one is already queued, the venue is
 * blocked, or its crawl isn't paused any more.
 */
export const TRIAL_REFUSALS = [
  'trial_pending',
  'blocked',
  'not_paused',
] as const;
export type TrialRefusal = (typeof TRIAL_REFUSALS)[number];

export type TrialOutcome = { ok: true } | { ok: false; code: TrialRefusal };

const isTrialRefusal = (code: unknown): code is TrialRefusal =>
  TRIAL_REFUSALS.some((known) => known === code);

/** A trial's refusal code, or null for any other failure. */
export const trialRefusalOf = (err: unknown): TrialRefusal | null =>
  err instanceof ApiError && err.status === 409 && isTrialRefusal(err.code)
    ? err.code
    : null;
