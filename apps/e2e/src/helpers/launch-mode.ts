/**
 * Mirrors `apps/web/src/lib/launch-mode.ts` for the suites that only make
 * sense once browsing is public. Set to "true" in the CI environment at the
 * same time the Vercel variable flips; until then the signed-out browse
 * assertions are skipped rather than failing against a correctly gated
 * deployment. See #794.
 */
export const PUBLIC_BROWSE_ENABLED =
  process.env['NEXT_PUBLIC_PUBLIC_BROWSE'] === 'true'
