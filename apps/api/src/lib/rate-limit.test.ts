import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

vi.mock('@sentry/hono/node', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('./logger.js', () => ({
  apiLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

const Sentry = await import('@sentry/hono/node')
const { apiLogger } = await import('./logger.js')
const { createRateLimiter, STORE_ERROR_RETRY_MS } =
  await import('./rate-limit.js')

// Never connects: postgres-js opens a socket on the first query, and the spy
// below throws before any query is built.
const client = postgres('postgresql://nobody@127.0.0.1:1/none')
const db = drizzle(client)
const limiter = createRateLimiter({ db, pruneSampleRate: 0 })

afterAll(async () => {
  await client.end()
})

const USER_KEY = 'feedback:user_2xSecretClerkId'
const RAW_MESSAGE = `Failed query: insert into "rate_limit_buckets" params: ${USER_KEY},1`

/** A Drizzle-shaped failure: params in the message, SQLSTATE on the cause. */
const drizzleShapedError = () => {
  const cause = Object.assign(new Error('connection terminated'), {
    code: '08006',
  })
  return Object.assign(new Error(RAW_MESSAGE), {
    name: 'DrizzleQueryError',
    cause,
  })
}

describe('rate limiter store errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(db, 'insert').mockImplementation(() => {
      throw drizzleShapedError()
    })
  })

  it('logs and reports neither the key nor the raw error message', async () => {
    await limiter.check(USER_KEY, 1, 60_000, {
      onStoreError: 'allow',
      userId: 'user_2xSecretClerkId',
    })

    const logged = JSON.stringify(vi.mocked(apiLogger.error).mock.calls)
    const reported = JSON.stringify([
      vi.mocked(Sentry.captureMessage).mock.calls,
      vi.mocked(Sentry.captureException).mock.calls,
    ])
    for (const payload of [logged, reported]) {
      expect(payload).not.toContain('user_2xSecretClerkId')
      expect(payload).not.toContain('Failed query')
      expect(payload).not.toContain('connection terminated')
    }
    expect(Sentry.captureException).not.toHaveBeenCalled()
  })

  it('keeps the limiter name, error class and SQLSTATE', async () => {
    await limiter.check(USER_KEY, 1, 60_000, { onStoreError: 'deny' })

    expect(apiLogger.error).toHaveBeenCalledWith(
      {
        error: { errorClass: 'DrizzleQueryError', code: '08006' },
        limiter: 'feedback',
        onStoreError: 'deny',
      },
      'rate-limit: store unavailable',
    )
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'rate-limit: store unavailable',
      {
        level: 'error',
        tags: {
          area: 'rate-limit',
          limiter: 'feedback',
          onStoreError: 'deny',
          errorClass: 'DrizzleQueryError',
          errorCode: '08006',
        },
      },
    )
  })

  it('fails open or closed as the call site chose', async () => {
    expect(
      await limiter.check(USER_KEY, 1, 60_000, { onStoreError: 'allow' }),
    ).toEqual({ allowed: true, retryAfterMs: 0 })
    expect(
      await limiter.check(USER_KEY, 1, 60_000, { onStoreError: 'deny' }),
    ).toEqual({ allowed: false, retryAfterMs: STORE_ERROR_RETRY_MS })
  })
})
