// apps/api/src/lib/trial.ts
//
// The card-less 14-day Premium trial (monetization eng infra spec Part 1
// Decision 6, §3). The trial is OUR concept, not Stripe's: no card, no
// subscription object, no charge. It exists solely as
// `user_billing.trialEndsAt`, seeded once per account and never cleared —
// the day-13 banner, the trial-ended takeover and the 90-day preserve clock
// all key off that one timestamp.

export const TRIAL_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * The trial expiry to seed for an account, or null when it gets no trial.
 * Accounts created before the cutover are the existing beta cohort — they
 * were gifted Premium outright and never see a trial (spec §3).
 *
 * The cutover is `founder_window.opensAt`: NULL until the admin opens the
 * window, which is the same launch-day instant monetization goes live. NULL
 * therefore means no account is trial-eligible yet.
 *
 * The cutover must only ever move forward once — an emergency rollback that
 * re-opens the window at a later instant would silently deny a trial to
 * anyone who signed up during the aborted window, unrepairably (Clerk owns
 * account creation dates; there is no `users` table to backfill from). The
 * rollback section of docs/runbooks/monetization-launch.md restores the
 * original instant by hand for exactly this reason.
 */
export const resolveTrialEndsAt = (
  accountCreatedAt: Date,
  monetizationLiveAt: Date | null,
): Date | null => {
  if (monetizationLiveAt === null) return null
  if (accountCreatedAt.getTime() < monetizationLiveAt.getTime()) return null
  return new Date(accountCreatedAt.getTime() + TRIAL_DAYS * DAY_MS)
}
