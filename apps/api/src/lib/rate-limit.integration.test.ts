import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, sql } from 'drizzle-orm'
import { rateLimitBuckets } from '@concert-crawl/db'
import { testDb } from '../test/helpers/db.js'
import { clearTables } from '../test/helpers/seed.js'
import { drainBackgroundTasks } from './background-tasks.js'
import {
  PRUNE_BATCH,
  STORE_ERROR_RETRY_MS,
  createRateLimiter,
  sweepExpiredRateLimitBuckets,
  type RateLimitOptions,
} from './rate-limit.js'
import { deleteUserData } from './user-data.js'

const WINDOW_MS = 60 * 60 * 1000
const ALLOW: RateLimitOptions = { onStoreError: 'allow' }
const DENY: RateLimitOptions = { onStoreError: 'deny' }

// Two independent connection pools stand in for two API instances: no shared
// process memory, only the database between them.
const dbUrl = process.env['DATABASE_URL'] ?? ''
const clientA = postgres(dbUrl, { max: 10 })
const clientB = postgres(dbUrl, { max: 10 })
const instanceA = createRateLimiter({
  db: drizzle(clientA),
  pruneSampleRate: 0,
})
const instanceB = createRateLimiter({
  db: drizzle(clientB),
  pruneSampleRate: 0,
})

afterAll(async () => {
  await clientA.end()
  await clientB.end()
})

beforeEach(async () => {
  await clearTables()
})

const expireBucket = async (key: string) => {
  await testDb
    .update(rateLimitBuckets)
    .set({ resetAt: sql`now() - interval '1 second'` })
    .where(eq(rateLimitBuckets.key, key))
}

describe('rate limiter (Postgres-backed)', () => {
  it('allows up to the limit, then blocks with the time left in the window', async () => {
    const key = 'test:single'
    for (let i = 0; i < 3; i++) {
      expect(await instanceA.check(key, 3, WINDOW_MS, ALLOW)).toEqual({
        allowed: true,
        retryAfterMs: 0,
      })
    }
    const blocked = await instanceA.check(key, 3, WINDOW_MS, ALLOW)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(WINDOW_MS - 60_000)
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(WINDOW_MS)
  })

  it('enforces one limit across two independent instances', async () => {
    const key = 'test:multi-instance'
    expect((await instanceA.check(key, 2, WINDOW_MS, ALLOW)).allowed).toBe(true)
    expect((await instanceB.check(key, 2, WINDOW_MS, ALLOW)).allowed).toBe(true)
    // Each instance has seen one hit; the Map version would allow both.
    expect((await instanceA.check(key, 2, WINDOW_MS, ALLOW)).allowed).toBe(
      false,
    )
    expect((await instanceB.check(key, 2, WINDOW_MS, ALLOW)).allowed).toBe(
      false,
    )
  })

  it('keeps separate keys separate', async () => {
    expect((await instanceA.check('test:a', 1, WINDOW_MS, ALLOW)).allowed).toBe(
      true,
    )
    expect((await instanceA.check('test:b', 1, WINDOW_MS, ALLOW)).allowed).toBe(
      true,
    )
  })

  it('opens a fresh window once the old one has passed', async () => {
    const key = 'test:rollover'
    await instanceA.check(key, 1, WINDOW_MS, ALLOW)
    expect((await instanceA.check(key, 1, WINDOW_MS, ALLOW)).allowed).toBe(
      false,
    )

    await expireBucket(key)

    expect(await instanceB.check(key, 1, WINDOW_MS, ALLOW)).toEqual({
      allowed: true,
      retryAfterMs: 0,
    })
    const [row] = await testDb
      .select()
      .from(rateLimitBuckets)
      .where(eq(rateLimitBuckets.key, key))
    expect(row?.count).toBe(1)
    expect(row?.resetAt.getTime()).toBeGreaterThan(Date.now() + WINDOW_MS / 2)
    expect((await instanceB.check(key, 1, WINDOW_MS, ALLOW)).allowed).toBe(
      false,
    )
  })

  it('rolls over on a real short window', async () => {
    const key = 'test:short-window'
    await instanceA.check(key, 1, 300, ALLOW)
    expect((await instanceA.check(key, 1, 300, ALLOW)).allowed).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 450))
    expect((await instanceA.check(key, 1, 300, ALLOW)).allowed).toBe(true)
  })

  it('never admits more than the limit under concurrent hits from two instances', async () => {
    const key = 'test:concurrent'
    const limit = 5
    const results = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        (i % 2 === 0 ? instanceA : instanceB).check(
          key,
          limit,
          WINDOW_MS,
          ALLOW,
        ),
      ),
    )
    expect(results.filter((result) => result.allowed)).toHaveLength(limit)
  })

  describe('when the store fails', () => {
    const failing = createRateLimiter({ db: testDb, pruneSampleRate: 0 })

    it("lets the request through for 'allow' (fail open)", async () => {
      const spy = vi.spyOn(testDb, 'insert').mockImplementation(() => {
        throw new Error('connection refused')
      })
      try {
        expect(await failing.check('test:open', 1, WINDOW_MS, ALLOW)).toEqual({
          allowed: true,
          retryAfterMs: 0,
        })
      } finally {
        spy.mockRestore()
      }
    })

    it("blocks the request for 'deny' (fail closed)", async () => {
      const spy = vi.spyOn(testDb, 'insert').mockImplementation(() => {
        throw new Error('connection refused')
      })
      try {
        expect(await failing.check('test:closed', 1, WINDOW_MS, DENY)).toEqual({
          allowed: false,
          retryAfterMs: STORE_ERROR_RETRY_MS,
        })
      } finally {
        spy.mockRestore()
      }
    })
  })

  describe('expired-bucket cleanup', () => {
    it('deletes expired buckets and keeps live ones', async () => {
      await instanceA.check('test:live', 5, WINDOW_MS, ALLOW)
      await instanceA.check('test:dead-1', 5, WINDOW_MS, ALLOW)
      await instanceA.check('test:dead-2', 5, WINDOW_MS, ALLOW)
      await expireBucket('test:dead-1')
      await expireBucket('test:dead-2')

      expect(await instanceA.pruneExpired()).toBe(2)
      const keys = (
        await testDb
          .select({ key: rateLimitBuckets.key })
          .from(rateLimitBuckets)
      ).map((row) => row.key)
      expect(keys).toEqual(['test:live'])
    })

    it('deletes at most one batch per pass', async () => {
      await testDb.insert(rateLimitBuckets).values(
        Array.from({ length: PRUNE_BATCH + 7 }, (_, i) => ({
          key: `test:bulk-${i}`,
          count: 1,
          resetAt: new Date(Date.now() - 60_000),
        })),
      )
      expect(await instanceA.pruneExpired()).toBe(PRUNE_BATCH)
      expect(await instanceA.pruneExpired()).toBe(7)
    })

    it('sweeps every expired bucket across batches, keeping live ones', async () => {
      await testDb.insert(rateLimitBuckets).values(
        Array.from({ length: PRUNE_BATCH * 2 + 3 }, (_, i) => ({
          key: `test:sweep-${i}`,
          count: 1,
          resetAt: new Date(Date.now() - 60_000),
        })),
      )
      await instanceA.check('test:sweep-live', 5, WINDOW_MS, ALLOW)

      expect(await sweepExpiredRateLimitBuckets(instanceA)).toBe(
        PRUNE_BATCH * 2 + 3,
      )
      const keys = (
        await testDb
          .select({ key: rateLimitBuckets.key })
          .from(rateLimitBuckets)
      ).map((row) => row.key)
      expect(keys).toEqual(['test:sweep-live'])
    })

    it('prunes in the background from a sampled hit', async () => {
      const sampled = createRateLimiter({
        db: testDb,
        pruneSampleRate: 1,
      })
      await testDb.insert(rateLimitBuckets).values({
        key: 'test:stale',
        count: 3,
        resetAt: new Date(Date.now() - 60_000),
      })
      await sampled.check('test:fresh', 5, WINDOW_MS, ALLOW)
      await drainBackgroundTasks()

      const keys = (
        await testDb
          .select({ key: rateLimitBuckets.key })
          .from(rateLimitBuckets)
      ).map((row) => row.key)
      expect(keys).toEqual(['test:fresh'])
    })
  })

  describe('account deletion', () => {
    it("removes the user's buckets, live ones included, and leaves others", async () => {
      const userId = `user_test_ratelimit_${Date.now()}`
      await instanceA.check(`feedback:${userId}`, 10, WINDOW_MS, {
        onStoreError: 'allow',
        userId,
      })
      await instanceB.check(`export:${userId}`, 1, WINDOW_MS, {
        onStoreError: 'allow',
        userId,
      })
      await instanceA.check('feedback:user_someone_else', 10, WINDOW_MS, {
        onStoreError: 'allow',
        userId: 'user_someone_else',
      })
      await instanceA.check('waitlist:203.0.113.9', 5, WINDOW_MS, ALLOW)

      await deleteUserData(userId)

      const remaining = await testDb
        .select({ key: rateLimitBuckets.key, userId: rateLimitBuckets.userId })
        .from(rateLimitBuckets)
      expect(remaining.map((row) => row.key).sort()).toEqual([
        'feedback:user_someone_else',
        'waitlist:203.0.113.9',
      ])
    })
  })
})
