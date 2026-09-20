/**
 * Pure helpers for sync-prod-public-data.ts CLI entry.
 * Extracted for unit-testability — no side effects, no DB access.
 */

/**
 * Parses CLI arguments from `process.argv` (or a test-supplied array).
 *
 * Recognised flags:
 *   --dry-run   Print what would be written without touching the staging DB.
 *
 * @param argv - Typically `process.argv`. The whole array is scanned for
 *   flags via `Array.includes`, so it doesn't matter whether the first two
 *   entries (node binary / script path) are included — they'll never match
 *   the flag strings the parser recognises.
 */
export function parseArgs(argv: string[]): { dryRun: boolean } {
  return {
    dryRun: argv.includes('--dry-run'),
  }
}

/**
 * Neon gives one branch two hostnames — a direct endpoint
 * `ep-x-y-123456.region.aws.neon.tech` and a pooled one
 * `ep-x-y-123456-pooler.region.aws.neon.tech`. Comparing the raw strings would
 * let the pooled prod host past a direct prod host and write the sync into
 * production, and picking the wrong one of the two is a single dropdown in the
 * Neon console. Strip the marker before comparing so both spellings of a
 * branch collapse to the same value.
 */
function neonBranchHost(hostname: string): string {
  return hostname.replace(/-pooler(?=\.|$)/, '')
}

/**
 * Belt-and-braces guard: throws if `stagingUrl` and `prodUrl` address the same
 * Neon branch. Catches the accidental-swap case where both env vars point at
 * the same database, including the case where they name it by different
 * endpoints (see `neonBranchHost`).
 *
 * @param prodUrl    - Value of `NEON_PROD_DIRECT`.
 * @param stagingUrl - Value of `NEON_STAGING_DIRECT`.
 *
 * @throws {Error} if the hosts resolve to the same branch — includes both env
 *   var names in the message so the operator knows which values to check.
 */
export function assertWriteHostNotProd(
  prodUrl: string,
  stagingUrl: string,
): void {
  let prodHost: string
  let stagingHost: string

  try {
    prodHost = new URL(prodUrl).hostname
  } catch (err) {
    throw new Error(
      `NEON_PROD_DIRECT is not a valid URL (missing scheme?). Fix the env var and retry.`,
      { cause: err },
    )
  }

  try {
    stagingHost = new URL(stagingUrl).hostname
  } catch (err) {
    throw new Error(
      `NEON_STAGING_DIRECT is not a valid URL (missing scheme?). Fix the env var and retry.`,
      { cause: err },
    )
  }

  if (neonBranchHost(prodHost) === neonBranchHost(stagingHost)) {
    throw new Error(
      `Refusing to write to prod: NEON_STAGING_DIRECT hostname (${stagingHost}) addresses the same Neon branch as NEON_PROD_DIRECT hostname (${prodHost}). Set NEON_STAGING_DIRECT to your staging connection string.`,
    )
  }
}
