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
  'user_3GYqkhiaCasabdEYXqtsdiUYjnD',
  'user_3GYqnPxZbye3I8zWTz1JHbIDHnq',
  'user_3GYqr7qRwQdEuUvmHEDiqkCPImQ',
  'user_3GYquWEByYLXHmyg3LqM3Z8nHJa',
  'user_3GYqwsWNeehFh3GWkjiVgYxwixZ',
] as const

export type FixtureUserId = (typeof FIXTURE_USER_IDS)[number]

export const FIXTURE_SEED = 202607_12
