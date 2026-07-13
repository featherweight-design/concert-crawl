import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the posthog-node SDK before importing the module under test.
const mockCapture = vi.fn()
const mockShutdown = vi.fn()
const mockPostHogCtor = vi.fn()
vi.mock('posthog-node', () => ({
  PostHog: class {
    constructor(...args: unknown[]) {
      mockPostHogCtor(...args)
    }
    capture = mockCapture
    shutdown = mockShutdown
  },
}))

import {
  captureServer,
  shutdownAnalytics,
  __resetAnalyticsForTest,
} from './analytics.js'

describe('captureServer', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    __resetAnalyticsForTest()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    __resetAnalyticsForTest()
  })

  it('no-ops when POSTHOG_KEY is absent', () => {
    delete process.env['POSTHOG_KEY']
    captureServer('user_1', 'founder_claim_attempted', {})
    expect(mockPostHogCtor).not.toHaveBeenCalled()
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('no-ops when POSTHOG_KEY is empty', () => {
    process.env['POSTHOG_KEY'] = ''
    captureServer('user_1', 'founder_claim_attempted', {})
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('captures with distinctId, event, and properties when configured', () => {
    process.env['POSTHOG_KEY'] = 'phc_test'
    captureServer('user_42', 'payment_succeeded', {
      tier: 'premium',
      amountCents: 900,
      flow: 'new',
    })
    expect(mockCapture).toHaveBeenCalledWith({
      distinctId: 'user_42',
      event: 'payment_succeeded',
      properties: { tier: 'premium', amountCents: 900, flow: 'new' },
    })
  })

  it('defaults the host to the US region when POSTHOG_HOST is unset', () => {
    process.env['POSTHOG_KEY'] = 'phc_test'
    delete process.env['POSTHOG_HOST']
    captureServer('user_1', 'founder_claim_attempted', {})
    expect(mockPostHogCtor).toHaveBeenCalledWith('phc_test', {
      host: 'https://us.i.posthog.com',
    })
  })

  it('treats an empty POSTHOG_HOST as unset and defaults to the US region', () => {
    process.env['POSTHOG_KEY'] = 'phc_test'
    process.env['POSTHOG_HOST'] = ''
    captureServer('user_1', 'founder_claim_attempted', {})
    expect(mockPostHogCtor).toHaveBeenCalledWith('phc_test', {
      host: 'https://us.i.posthog.com',
    })
  })

  it('honors an explicit POSTHOG_HOST', () => {
    process.env['POSTHOG_KEY'] = 'phc_test'
    process.env['POSTHOG_HOST'] = 'https://eu.i.posthog.com'
    captureServer('user_1', 'founder_claim_attempted', {})
    expect(mockPostHogCtor).toHaveBeenCalledWith('phc_test', {
      host: 'https://eu.i.posthog.com',
    })
  })

  it('resolves the client once — a second call does not re-read env', () => {
    process.env['POSTHOG_KEY'] = 'phc_test'
    captureServer('user_1', 'founder_claim_attempted', {})
    captureServer('user_2', 'founder_claim_attempted', {})
    expect(mockPostHogCtor).toHaveBeenCalledTimes(1)
    expect(mockCapture).toHaveBeenCalledTimes(2)
  })

  it('swallows a capture throw and never propagates', () => {
    process.env['POSTHOG_KEY'] = 'phc_test'
    mockCapture.mockImplementationOnce(() => {
      throw new Error('queue full')
    })
    expect(() =>
      captureServer('user_1', 'founder_claim_attempted', {}),
    ).not.toThrow()
  })

  it('swallows a constructor throw and disables analytics', () => {
    process.env['POSTHOG_KEY'] = 'phc_test'
    mockPostHogCtor.mockImplementationOnce(() => {
      throw new Error('invalid host')
    })
    expect(() =>
      captureServer('user_1', 'founder_claim_attempted', {}),
    ).not.toThrow()
    // Construction failed, so no capture is attempted and the failure never
    // reaches the billing/webhook caller.
    expect(mockCapture).not.toHaveBeenCalled()
  })
})

describe('shutdownAnalytics', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    __resetAnalyticsForTest()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    __resetAnalyticsForTest()
  })

  it('no-ops when the client was never constructed', async () => {
    await shutdownAnalytics()
    expect(mockShutdown).not.toHaveBeenCalled()
  })

  it('flushes the client when configured', async () => {
    process.env['POSTHOG_KEY'] = 'phc_test'
    mockShutdown.mockResolvedValueOnce(undefined)
    captureServer('user_1', 'founder_claim_attempted', {})
    await shutdownAnalytics()
    expect(mockShutdown).toHaveBeenCalledTimes(1)
  })
})
