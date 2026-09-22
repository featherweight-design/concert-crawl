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

  it('caps absolute socket age below postgres.js own 30-minute floor', () => {
    // postgres.js: `max_lifetime = 60 * (30 + Math.random() * 30)`, so its
    // shortest possible default is 30 minutes. Anything at or above that is
    // not actually a cap.
    expect(poolOptions(NEON).max_lifetime).toBeLessThan(30 * 60)
  })

  it('applies both timeouts locally too', () => {
    // Local Postgres does not suspend, but a pool that only behaves correctly
    // against one host is a pool whose behaviour nobody can reason about.
    const local = poolOptions(LOCAL)
    expect(local.idle_timeout).toBeLessThan(
      POOL_TIMEOUT_BOUNDS.neonSuspendSeconds,
    )
    expect(local.max_lifetime).toBeLessThan(30 * 60)
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
