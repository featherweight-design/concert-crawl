import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockWaitUntil, mockFlush } = vi.hoisted(() => ({
  mockWaitUntil: vi.fn(),
  mockFlush: vi.fn(),
}))
vi.mock('@vercel/functions', () => ({ waitUntil: mockWaitUntil }))
vi.mock('@sentry/hono/node', () => ({ flush: mockFlush }))

import { SENTRY_FLUSH_TIMEOUT_MS, withSentryFlush } from './sentry-flush.js'

describe('withSentryFlush', () => {
  const original = process.env['VERCEL']

  beforeEach(() => {
    mockWaitUntil.mockClear()
    mockFlush.mockReset()
    mockFlush.mockResolvedValue(true)
  })

  afterEach(() => {
    if (original === undefined) delete process.env['VERCEL']
    else process.env['VERCEL'] = original
  })

  it('passes the response through and registers a bounded flush on Vercel', async () => {
    process.env['VERCEL'] = '1'
    const response = new Response('ok', { status: 500 })
    const wrapped = withSentryFlush(async () => response)
    await expect(wrapped(new Request('http://x/'))).resolves.toBe(response)
    expect(mockWaitUntil).toHaveBeenCalledTimes(1)
    await mockWaitUntil.mock.calls[0]?.[0]
    expect(mockFlush).toHaveBeenCalledWith(SENTRY_FLUSH_TIMEOUT_MS)
  })

  it('still flushes when the handler throws, and rethrows', async () => {
    process.env['VERCEL'] = '1'
    const wrapped = withSentryFlush(() => {
      throw new Error('boom')
    })
    await expect(wrapped(new Request('http://x/'))).rejects.toThrow('boom')
    expect(mockWaitUntil).toHaveBeenCalledTimes(1)
  })

  it('never hands waitUntil a rejecting promise when the flush fails', async () => {
    process.env['VERCEL'] = '1'
    mockFlush.mockRejectedValueOnce(new Error('transport down'))
    await withSentryFlush(async () => new Response('ok'))(
      new Request('http://x/'),
    )
    await expect(mockWaitUntil.mock.calls[0]?.[0]).resolves.toBeUndefined()
  })

  it('settles cleanly when the flush times out (resolves false)', async () => {
    process.env['VERCEL'] = '1'
    mockFlush.mockResolvedValueOnce(false)
    await withSentryFlush(async () => new Response('ok'))(
      new Request('http://x/'),
    )
    await expect(mockWaitUntil.mock.calls[0]?.[0]).resolves.toBeUndefined()
    expect(mockFlush).toHaveBeenCalledTimes(1)
  })

  it('adds nothing on the Node server', async () => {
    delete process.env['VERCEL']
    await withSentryFlush(async () => new Response('ok'))(
      new Request('http://x/'),
    )
    expect(mockWaitUntil).not.toHaveBeenCalled()
    expect(mockFlush).not.toHaveBeenCalled()
  })
})
