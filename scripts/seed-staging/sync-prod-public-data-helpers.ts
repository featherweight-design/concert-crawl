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
 * Belt-and-braces guard: throws if the host of `stagingUrl` matches the host
 * of `prodUrl`. Catches the accidental-swap case where both env vars point at
 * the same Neon project host.
 *
 * @param prodUrl    - Value of `NEON_PROD_DIRECT`.
 * @param stagingUrl - Value of `NEON_STAGING_DIRECT`.
 *
 * @throws {Error} if the parsed hosts match — includes both env var names in
 *   the message so the operator knows which values to check.
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

  if (prodHost === stagingHost) {
    throw new Error(
      `Refusing to write to prod: NEON_STAGING_DIRECT hostname (${stagingHost}) matches NEON_PROD_DIRECT hostname. Set NEON_STAGING_DIRECT to your staging connection string.`,
    )
  }
}
