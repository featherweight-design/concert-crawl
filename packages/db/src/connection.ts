/**
 * Returns true when the connection string points to a local Postgres instance.
 * Uses URL hostname parsing to avoid false positives from substring matches
 * (e.g. a remote host whose name happens to contain "localhost").
 * Falls back to includes() if the URL is malformed.
 */
export function isLocalConnectionString(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString)
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    )
  } catch {
    return (
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1')
    )
  }
}

/**
 * Neon suspends an idle compute after 300 seconds (`suspend_timeout_seconds: 0`
 * on the prod endpoint means "use the default", not "never"). Every suspend
 * closes the pooler's sockets, but postgres.js keeps its own pooled sockets for
 * `max_lifetime` — which defaults to a RANDOM 30–60 minutes — so a pool can
 * hold connections an order of magnitude longer than the server keeps them
 * alive. A request that lands on one of those dead sockets fails with
 * `write CONNECTION_CLOSED`; postgres.js reconnects for the NEXT query but does
 * not retry the in-flight one, so the caller gets a 500.
 *
 * That is exactly what took out two concurrent `GET /v1/events` queries in
 * production on 2026-09-20 (Sentry CONCERT-CRAWL-API-G / -H). It reads as a
 * one-off because it needs a request inside the window between the suspend and
 * the pool noticing, and pre-launch traffic is thin — at open-signup volume it
 * becomes a steady trickle of 500s on the busiest read endpoint.
 *
 * So the pool must retire its own sockets before Neon does. Keeping the compute
 * warm instead is the wrong lever: it spends compute-hours to paper over a
 * client misconfiguration, and the 300s default is correct for traffic this
 * thin.
 */
const NEON_SUSPEND_SECONDS = 300

/** Close a socket that has gone unused for this long. Must stay below
 * {@link MAX_LIFETIME_SECONDS}, which is itself below
 * {@link NEON_SUSPEND_SECONDS} — that ordering is the whole fix, and
 * `pool-options.test.ts` asserts it rather than trusting the comment. */
const IDLE_TIMEOUT_SECONDS = 60

/**
 * Absolute cap on socket age, replacing postgres.js's random 30–60 minutes.
 * Also below {@link NEON_SUSPEND_SECONDS}, and that is the point rather than a
 * nicety: `idle_timeout` only reclaims a socket that has gone quiet, so a
 * socket kept in steady use is reclaimed by this bound alone. A cap above the
 * suspend window would let such a socket outlive several suspends and hit the
 * very race this change exists to close — a compute does not only suspend on
 * idleness, it also restarts for maintenance and compute-release upgrades,
 * neither of which the pool observes.
 *
 * Reconnecting every few minutes costs a handshake against a compute that is
 * already cold-starting on a five-minute cycle, which is no cost at all.
 */
const MAX_LIFETIME_SECONDS = 240

export type PoolOptions = {
  prepare: false
  ssl: 'require' | false
  idle_timeout: number
  max_lifetime: number
}

/**
 * Connection options for the long-lived query pool, derived from the
 * connection string. Pure and exported so the timeout invariants above are
 * testable — `client.ts` builds its pool at module load, which is not.
 */
export function poolOptions(connectionString: string): PoolOptions {
  return {
    // Prepared statements are incompatible with serverless connection poolers
    // (Neon's pooler, Render's pgbouncer) in transaction mode.
    prepare: false,
    ssl: isLocalConnectionString(connectionString) ? false : 'require',
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    max_lifetime: MAX_LIFETIME_SECONDS,
  }
}

/** Exported for the tests that pin the ordering, not for callers. */
export const POOL_TIMEOUT_BOUNDS = {
  neonSuspendSeconds: NEON_SUSPEND_SECONDS,
} as const
