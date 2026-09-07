import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const isFeatureEnabled = vi.fn()
vi.mock('../lib/feature-flags.js', () => ({ isFeatureEnabled }))

const { requireFlag } = await import('./feature-flag.js')

const buildApp = () => {
  const app = new Hono()
  app.use('*', requireFlag('crews'))
  app.get('/thing', (ctx) => ctx.json({ success: true }))
  return app
}

describe('requireFlag', () => {
  beforeEach(() => {
    isFeatureEnabled.mockReset()
  })

  it('passes the request through when the flag is on', async () => {
    isFeatureEnabled.mockResolvedValue(true)
    const res = await buildApp().request('/thing')
    expect(res.status).toBe(200)
  })

  it('answers 404 when the flag is off', async () => {
    isFeatureEnabled.mockResolvedValue(false)
    const res = await buildApp().request('/thing')
    expect(res.status).toBe(404)
  })

  it('never names the flag in the response body', async () => {
    isFeatureEnabled.mockResolvedValue(false)
    const res = await buildApp().request('/thing')
    expect(JSON.stringify(await res.json())).not.toContain('crews')
  })

  it('answers 404 when the flag lookup throws', async () => {
    isFeatureEnabled.mockRejectedValue(new Error('boom'))
    const res = await buildApp().request('/thing')
    expect(res.status).toBe(404)
  })
})
