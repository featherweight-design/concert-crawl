import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

// Sentry mock must be hoisted before the module under test imports it,
// mirroring apps/api/src/routes/admin/prices.integration.test.ts:5-14.
vi.mock('@sentry/hono/node', async () => {
  const actual =
    await vi.importActual<typeof import('@sentry/hono/node')>(
      '@sentry/hono/node',
    )
  return {
    ...actual,
    captureException: vi.fn(),
  }
})

vi.mock('./logger.js', () => ({
  apiLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

const { captureException } = await import('@sentry/hono/node')
const { apiLogger } = await import('./logger.js')
const { errorHandler } = await import('./error-handler.js')

function appWithHandler() {
  const app = new Hono()
  app.post(
    '/validated',
    zValidator('json', z.object({ name: z.string() })),
    (ctx) => ctx.json({ success: true }),
  )
  app.get('/boom', () => {
    throw new Error('kaboom')
  })
  app.get('/upstream-down', () => {
    throw new HTTPException(503, { message: 'Upstream unavailable' })
  })
  app.onError(errorHandler)
  return app
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // The production regression: 12 Sentry error-level events (CONCERT-CRAWL-API-A/B)
  // from clients POSTing unparseable bodies, which also tripped the
  // sustained-error-volume monitor.
  it('returns 400 and does NOT report to Sentry for an unparseable JSON body', async () => {
    const res = await appWithHandler().request('/validated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not json',
    })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      success: false,
      error: 'Malformed JSON in request body',
    })
    expect(captureException).not.toHaveBeenCalled()
  })

  it('reports unexpected errors to Sentry as a 500', async () => {
    const res = await appWithHandler().request('/boom')

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      success: false,
      error: 'Internal server error',
    })
    expect(captureException).toHaveBeenCalledTimes(1)
    expect(apiLogger.error).toHaveBeenCalled()
  })

  // A 5xx HTTPException means something on our side failed, so it keeps the
  // pre-existing treatment: reported to Sentry and answered as a generic 500.
  it('still reports 5xx HTTPExceptions to Sentry', async () => {
    const res = await appWithHandler().request('/upstream-down')

    expect(res.status).toBe(500)
    expect(captureException).toHaveBeenCalledTimes(1)
  })

  it('logs client errors at warn, not error', async () => {
    await appWithHandler().request('/validated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'nope',
    })

    expect(apiLogger.warn).toHaveBeenCalled()
    expect(apiLogger.error).not.toHaveBeenCalled()
  })
})
