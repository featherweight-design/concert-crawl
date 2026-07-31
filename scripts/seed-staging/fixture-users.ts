/**
 * Concert Crawl — reserved staging Clerk fixture users for the synthetic seeder.
 *
 * These are real Clerk staging user IDs, not secrets. The associated Clerk
 * sessions and any auth tokens are secrets and must never be committed.
 *
 * Adding a new fixture user:
 *   1. Open the Clerk staging dashboard → Users → Create user.
 *   2. Copy the generated `user_XXX` ID.
 *   3. Paste it into FIXTURE_USER_IDS below.
 *   4. Re-run `pnpm db:seed:staging` to regenerate synthetic data.
 *
 * These are the reserved staging fixture users (alpha, bravo, charlie, delta,
 * echo) provisioned in the Clerk staging dashboard.
 */
export const FIXTURE_USER_IDS = [
  'user_3GYqkhiaCasabdEYXqtsdiUYjnD', // alpha
  'user_3GYqnPxZbye3I8zWTz1JHbIDHnq', // bravo
  'user_3GYqr7qRwQdEuUvmHEDiqkCPImQ', // charlie
  'user_3GYquWEByYLXHmyg3LqM3Z8nHJa', // delta
  'user_3GYqwsWNeehFh3GWkjiVgYxwixZ', // echo
] as const

export type FixtureUserId = (typeof FIXTURE_USER_IDS)[number]

/**
 * Hugh's own staging Clerk account. Seeded with a Concert History of its own so
 * History can be exercised while signed in as the real owner rather than as a
 * fixture user — the five fixture accounts above can't be logged into casually.
 *
 * Only user_events are generated for this ID. The profile, feedback,
 * notifications and price submissions on this account are real rows created by
 * hand while testing, and the seeder must never delete them.
 */
export const OWNER_USER_ID = 'user_3Cr1V8iMq5Ey5iHsF66tKxIuRe0'

/**
 * Synthetic watcher-crowd users. "Who else is watching" reports a `total` count
 * alongside a `named` roster capped at 25, and the five fixture users can't
 * populate either meaningfully. These IDs are never signed into — the watchers
 * endpoint reads `user_profiles.handle`, so a crowd needs no Clerk account.
 */
export const CROWD_USER_IDS: readonly string[] = Array.from(
  { length: 40 },
  (_, idx) => `user_seedcrowd_${String(idx).padStart(4, '0')}`,
)

export const FIXTURE_SEED = 202607_12
