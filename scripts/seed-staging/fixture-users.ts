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
 * The placeholder IDs below are the accepted PR-open state. Replace them with
 * real staging IDs before the seeder is exercised against the staging database.
 */
export const FIXTURE_USER_IDS = [
  'user_2fixture_alpha',
  'user_2fixture_bravo',
  'user_2fixture_charlie',
  'user_2fixture_delta',
  'user_2fixture_echo',
] as const

export type FixtureUserId = (typeof FIXTURE_USER_IDS)[number]

export const FIXTURE_SEED = 202607_12
