/*
 * Prod-host guard for the UI audit sweep.
 *
 * Both runSweep and prepareAuditAuth take PLAYWRIGHT_AUDIT_BASE_URL from env.
 * A mis-set env var could point either code path at production — page.goto
 * would visit prod, or the Clerk login flow would authenticate against prod
 * with fixture credentials (potentially locking real accounts or leaving
 * synthetic-looking activity in prod). This module refuses to proceed when
 * the resolved hostname matches a known-prod host.
 *
 * Mirrors the pattern in scripts/seed-staging/sync-prod-public-data-helpers.ts
 * — a small blocklist beats an allowlist because it lets local dev
 * (localhost, ngrok, LAN IPs) and any staging variant run without extra
 * config, while still refusing the one thing that must never happen.
 */

const PROD_HOSTS = new Set(['concertcrawl.app', 'www.concertcrawl.app'])

/**
 * Throws if the supplied URL resolves to a production hostname. Called by
 * runSweep and prepareAuditAuth before any network activity.
 */
export function assertNotProdBaseUrl(url: string): void {
  let rawHostname: string
  try {
    rawHostname = new URL(url).hostname
  } catch (err) {
    throw new Error(
      `assertNotProdBaseUrl: could not parse '${url}' as a URL: ${String(err)}`,
    )
  }
  // Normalize the FQDN trailing dot — `concertcrawl.app.` is DNS-equivalent
  // to `concertcrawl.app` on most resolvers, so treating them as different
  // strings would let a trailing-dot URL bypass the blocklist. Also
  // lowercase for good measure; browsers already lowercase hostnames but
  // `new URL()` in Node preserves case if the input contains it.
  const hostname = rawHostname.replace(/\.$/, '').toLowerCase()
  if (PROD_HOSTS.has(hostname)) {
    throw new Error(
      `assertNotProdBaseUrl: refusing to run audit against production host '${rawHostname}'. Set PLAYWRIGHT_AUDIT_BASE_URL to a staging URL (e.g. https://staging.concertcrawl.app).`,
    )
  }
}
