// apps/api/src/lib/trial.ts
//
// The card-less 14-day Premium trial (monetization eng infra spec Part 1
// Decision 6, §3). The trial is OUR concept, not Stripe's: no card, no
// subscription object, no charge. It exists solely as
// `user_billing.trialEndsAt`, seeded once per account and never cleared —
// the day-13 banner, the trial-ended takeover and the 90-day preserve clock
// all key off that one timestamp.

import { z } from 'zod'

export const TRIAL_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

const monetizationLiveAtSchema = z.string().datetime()

/**
 * The cutover instant from `MONETIZATION_LIVE_AT`. Unset means monetization
 * has not launched, so no account is trial-eligible yet — the same
 * Hugh-only launch-day flip as `founder_window.opensAt`, which is NULL
 * until launch for the same reason.
 */
export const resolveMonetizationLiveAt = (
  raw: string | undefined,
): Date | null => {
  const parsed = monetizationLiveAtSchema.safeParse(raw)
  return parsed.success ? new Date(parsed.data) : null
}

/**
 * The trial expiry to seed for an account, or null when it gets no trial.
 * Accounts created before the cutover are the existing beta cohort — they
 * were gifted Premium outright and never see a trial (spec §3).
 */
export const resolveTrialEndsAt = (
  accountCreatedAt: Date,
  monetizationLiveAt: Date | null,
): Date | null => {
  if (monetizationLiveAt === null) return null
  if (accountCreatedAt.getTime() < monetizationLiveAt.getTime()) return null
  return new Date(accountCreatedAt.getTime() + TRIAL_DAYS * DAY_MS)
}
