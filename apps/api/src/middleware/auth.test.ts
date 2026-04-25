import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { requireAuth } from './auth.js'

describe('requireAuth middleware', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const app = new Hono()
    app.use('/protected', requireAuth)
    app.get('/protected', (ctx) => ctx.json({ ok: true }))

    const res = await app.request('/protected')
    expect(res.status).toBe(401)
  })

  it('returns 401 when Authorization header is malformed', async () => {
    const app = new Hono()
    app.use('/protected', requireAuth)
    app.get('/protected', (ctx) => ctx.json({ ok: true }))

    const res = await app.request('/protected', {
      headers: { Authorization: 'NotBearer token' },
    })
    expect(res.status).toBe(401)
  })
})
