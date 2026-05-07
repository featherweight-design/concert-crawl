import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => null,
}))

import { createApp } from '../app.js'
import { clearTables } from '../test/helpers/seed.js'

const app = createApp()

describe('GET /v1/health — integration', () => {
  beforeEach(async () => {
    await clearTables()
  })

  it('returns 200 with status ok', async () => {
    const res = await app.request('/v1/health')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ status: 'ok' })
  })
})
