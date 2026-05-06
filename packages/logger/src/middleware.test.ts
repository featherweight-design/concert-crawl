import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { createLogger } from './index.js'
import { requestLogger } from './middleware.js'

describe('requestLogger', () => {
  const logger = createLogger('test')

  it('calls next() and returns the response', async () => {
    const app = new Hono()
    app.use(requestLogger(logger))
    app.get('/ping', (c) => c.json({ ok: true }))

    const res = await app.request('/ping')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('attaches a UUID requestId to the context', async () => {
    const app = new Hono()
    let capturedId: string | undefined

    app.use(requestLogger(logger))
    app.get('/ping', (c) => {
      capturedId = c.get('requestId')
      return c.json({ ok: true })
    })

    await app.request('/ping')
    expect(capturedId).toBeDefined()
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(capturedId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it('does not overwrite an existing requestId', async () => {
    const app = new Hono()
    let capturedId: string | undefined

    app.use(async (c, next) => {
      c.set('requestId', 'preset-id')
      await next()
    })
    app.use(requestLogger(logger))
    app.get('/ping', (c) => {
      capturedId = c.get('requestId')
      return c.json({ ok: true })
    })

    await app.request('/ping')
    expect(capturedId).toBe('preset-id')
  })
})
