import { describe, it, expect } from 'vitest'
import { poolOptions, POOL_TIMEOUT_BOUNDS } from './connection.js'

const LOCAL = 'postgresql://postgres:postgres@localhost:5433/concert_crawl_db'
const NEON =
  'postgresql://user:pass@ep-raspy-hall-a6f9qakl-pooler.us-west-2.aws.neon.tech:5432/concert_crawl?sslmode=require'

describe('poolOptions', () => {
  // The regression. Sentry CONCERT-CRAWL-API-G / -H were two concurrent
  // `GET /v1/events` queries killed by `write CONNECTION_CLOSED` after Neon
  // suspended the compute out from under sockets the pool still believed in.
  // postgres.js defaults `max_lifetime` to a random 30-60 minutes and
  // `idle_timeout` to null, so without these options the pool outlives the
  // server by an order of magnitude.
  it('retires idle sockets before Neon suspends the compute', () => {
    expect(poolOptions(NEON).idle_timeout).toBeLessThan(
      POOL_TIMEOUT_BOUNDS.neonSuspendSeconds,
    )
  })

  // `idle_timeout` only reclaims a socket that has gone quiet, so a socket in
  // steady use is bounded by `max_lifetime` alone. Capping it above the suspend
  // window would let that socket outlive several suspends and hit the same
  // race. Asserting against 30 minutes — postgres.js's own shortest default —
  // would pass for any value under 1,800s and so would not encode the fix.
  it('caps absolute socket age below the suspend window too', () => {
    expect(poolOptions(NEON).max_lifetime).toBeLessThan(
      POOL_TIMEOUT_BOUNDS.neonSuspendSeconds,
    )
  })

  it('reclaims a quiet socket before it reaches the absolute cap', () => {
    // The ordering the two timeouts are meant to have: quiet sockets go first,
    // and the lifetime cap is the backstop for the ones that never go quiet.
    const { idle_timeout, max_lifetime } = poolOptions(NEON)
    expect(idle_timeout).toBeLessThan(max_lifetime)
  })

  it('applies both timeouts locally too', () => {
    // Local Postgres does not suspend, but a pool that only behaves correctly
    // against one host is a pool whose behaviour nobody can reason about.
    const local = poolOptions(LOCAL)
    expect(local.idle_timeout).toBeLessThan(
      POOL_TIMEOUT_BOUNDS.neonSuspendSeconds,
    )
    expect(local.max_lifetime).toBeLessThan(
      POOL_TIMEOUT_BOUNDS.neonSuspendSeconds,
    )
  })

  it('requires SSL for a remote host and skips it locally', () => {
    expect(poolOptions(NEON).ssl).toBe('require')
    expect(poolOptions(LOCAL).ssl).toBe(false)
  })

  it('never enables prepared statements', () => {
    // Transaction-mode poolers (Neon's pooler, Render's pgbouncer) cannot
    // carry a prepared statement across the connections they multiplex.
    expect(poolOptions(NEON).prepare).toBe(false)
    expect(poolOptions(LOCAL).prepare).toBe(false)
  })
})
