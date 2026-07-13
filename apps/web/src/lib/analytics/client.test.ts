// @vitest-environment jsdom
// initAnalytics bails when `window` is undefined (SSR guard), so these tests
// need a DOM environment for posthog.init to run.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockInit = vi.fn()
const mockCapture = vi.fn()
const mockIdentify = vi.fn()
const mockReset = vi.fn()
vi.mock('posthog-js', () => ({
  default: {
    init: mockInit,
    capture: mockCapture,
    identify: mockIdentify,
    reset: mockReset,
  },
}))

const loadModule = async () => {
  vi.resetModules()
  return import('./client')
}

describe('web analytics client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('does not init when NEXT_PUBLIC_POSTHOG_KEY is absent', async () => {
    delete process.env['NEXT_PUBLIC_POSTHOG_KEY']
    const analytics = await loadModule()
    analytics.initAnalytics()
    expect(mockInit).not.toHaveBeenCalled()
    expect(analytics.isAnalyticsEnabled()).toBe(false)
  })

  it('track/identify/reset no-op when disabled', async () => {
    delete process.env['NEXT_PUBLIC_POSTHOG_KEY']
    const analytics = await loadModule()
    analytics.track('founder_window_view', { state: 'open' })
    analytics.identifyUser('user_1')
    analytics.resetAnalyticsIdentity()
    expect(mockCapture).not.toHaveBeenCalled()
    expect(mockIdentify).not.toHaveBeenCalled()
    expect(mockReset).not.toHaveBeenCalled()
  })

  it('inits with the US host default and identified-only profiles', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    delete process.env['NEXT_PUBLIC_POSTHOG_HOST']
    const analytics = await loadModule()
    analytics.initAnalytics()
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
      }),
    )
    expect(analytics.isAnalyticsEnabled()).toBe(true)
  })

  it('honors an explicit NEXT_PUBLIC_POSTHOG_HOST', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    process.env['NEXT_PUBLIC_POSTHOG_HOST'] = 'https://eu.i.posthog.com'
    const analytics = await loadModule()
    analytics.initAnalytics()
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ api_host: 'https://eu.i.posthog.com' }),
    )
  })

  it('inits only once across repeated calls', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics()
    analytics.initAnalytics()
    expect(mockInit).toHaveBeenCalledTimes(1)
  })

  it('captures typed events when enabled', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics()
    analytics.track('monetization_tier_selected', {
      tier: 'premium',
      plan: 'free',
    })
    expect(mockCapture).toHaveBeenCalledWith('monetization_tier_selected', {
      tier: 'premium',
      plan: 'free',
    })
  })

  it('identify and reset delegate to posthog when enabled', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics()
    analytics.identifyUser('user_9')
    analytics.resetAnalyticsIdentity()
    expect(mockIdentify).toHaveBeenCalledWith('user_9')
    expect(mockReset).toHaveBeenCalledTimes(1)
  })
})
