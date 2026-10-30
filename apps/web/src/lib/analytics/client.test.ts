// @vitest-environment jsdom
// initAnalytics bails when `window` is undefined (SSR guard), so these tests
// need a DOM environment for posthog.init to run.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockInit = vi.fn()
const mockCapture = vi.fn()
const mockIdentify = vi.fn()
const mockReset = vi.fn()
const mockRegister = vi.fn()
const mockGetProperty = vi.fn()
const mockSetPersonProperties = vi.fn()
const mockUnsetPersonProperties = vi.fn()
vi.mock('posthog-js', () => ({
  default: {
    init: mockInit,
    capture: mockCapture,
    identify: mockIdentify,
    reset: mockReset,
    register: mockRegister,
    get_property: mockGetProperty,
    setPersonProperties: mockSetPersonProperties,
    unsetPersonProperties: mockUnsetPersonProperties,
  },
}))

const PROD = 'concertcrawl.app'

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
    analytics.initAnalytics(PROD)
    expect(mockInit).not.toHaveBeenCalled()
    expect(analytics.isAnalyticsEnabled()).toBe(false)
  })

  it('does not init off the production hostname, even with a key', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    for (const host of [
      'staging.concertcrawl.app',
      'localhost',
      'concert-crawl-git-main.vercel.app',
    ]) {
      const analytics = await loadModule()
      analytics.initAnalytics(host)
      expect(analytics.isAnalyticsEnabled()).toBe(false)
    }
    expect(mockInit).not.toHaveBeenCalled()
  })

  it('reads the page hostname when none is passed', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    // jsdom serves the test page from localhost, which is not production.
    analytics.initAnalytics()
    expect(mockInit).not.toHaveBeenCalled()
  })

  it('inits on the www production hostname', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics('www.concertcrawl.app')
    expect(mockInit).toHaveBeenCalledTimes(1)
  })

  it('track/identify/reset no-op when disabled', async () => {
    delete process.env['NEXT_PUBLIC_POSTHOG_KEY']
    const analytics = await loadModule()
    analytics.track('passport_shared', { destination: 'system' })
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
    analytics.initAnalytics(PROD)
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
      }),
    )
    expect(analytics.isAnalyticsEnabled()).toBe(true)
  })

  it('treats an empty NEXT_PUBLIC_POSTHOG_HOST as unset and uses the US default', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    process.env['NEXT_PUBLIC_POSTHOG_HOST'] = ''
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ api_host: 'https://us.i.posthog.com' }),
    )
  })

  it('honors an explicit NEXT_PUBLIC_POSTHOG_HOST', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    process.env['NEXT_PUBLIC_POSTHOG_HOST'] = 'https://eu.i.posthog.com'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ api_host: 'https://eu.i.posthog.com' }),
    )
  })

  it('inits only once across repeated calls', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    analytics.initAnalytics(PROD)
    expect(mockInit).toHaveBeenCalledTimes(1)
  })

  it('captures typed events when enabled', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    analytics.track('share_destination_selected', {
      eventId: 'evt_1',
      destination: 'copy-link',
    })
    expect(mockCapture).toHaveBeenCalledWith('share_destination_selected', {
      eventId: 'evt_1',
      destination: 'copy-link',
    })
  })

  it('identify and reset delegate to posthog when enabled', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    analytics.identifyUser('user_9')
    mockGetProperty.mockReturnValue('identified')
    analytics.resetAnalyticsIdentity()
    expect(mockIdentify).toHaveBeenCalledWith('user_9')
    expect(mockGetProperty).toHaveBeenCalledWith('$user_state')
    expect(mockReset).toHaveBeenCalledTimes(1)
  })

  it('re-registers the build super-properties after a reset clears them', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    process.env['NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA'] = 'abcdef0123456'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    mockRegister.mockClear()
    mockGetProperty.mockReturnValue('identified')
    analytics.resetAnalyticsIdentity()
    expect(mockReset).toHaveBeenCalledTimes(1)
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ release: 'abcdef0' }),
    )
    expect(mockReset.mock.invocationCallOrder[0]).toBeLessThan(
      mockRegister.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('redacts every outgoing event through before_send', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    const { redactCapture } = await import('./redact')
    analytics.initAnalytics(PROD)
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({ before_send: redactCapture }),
    )
  })

  it('sets the display name as a person property', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    analytics.setPersonName('adal')
    expect(mockSetPersonProperties).toHaveBeenCalledWith({ name: 'adal' })
    expect(mockUnsetPersonProperties).not.toHaveBeenCalled()
  })

  it('removes the name when the reader has no handle', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    analytics.setPersonName(null)
    expect(mockUnsetPersonProperties).toHaveBeenCalledWith('name')
    expect(mockSetPersonProperties).not.toHaveBeenCalled()
  })

  it('does not touch the name while analytics is off', async () => {
    delete process.env['NEXT_PUBLIC_POSTHOG_KEY']
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    analytics.setPersonName('adal')
    analytics.setPersonName(null)
    expect(mockSetPersonProperties).not.toHaveBeenCalled()
    expect(mockUnsetPersonProperties).not.toHaveBeenCalled()
  })

  it('does not reset an anonymous browser, so a signed-out load keeps its id', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    mockGetProperty.mockReturnValue('anonymous')
    analytics.resetAnalyticsIdentity()
    expect(mockReset).not.toHaveBeenCalled()
  })

  it('turns on usage basics: autocapture, history pageviews, no replay, DNT', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        autocapture: { url_ignorelist: [analytics.ADMIN_URL] },
        mask_all_text: false,
        mask_all_element_attributes: false,
        capture_pageview: 'history_change',
        disable_session_recording: true,
        respect_dnt: true,
        advanced_disable_flags: true,
      }),
    )
  })

  it('keeps campaign tags, click ids and search keywords out of events', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    const config = mockInit.mock.calls[0]?.[1]
    expect(config).toMatchObject({ save_campaign_params: false })
    for (const key of [
      'utm_source',
      'gclid',
      'fbclid',
      'ph_keyword',
      '$initial_utm_campaign',
      '$initial_ph_keyword',
      '$session_entry_utm_term',
      '$session_entry_msclkid',
    ]) {
      expect(config.property_denylist).toContain(key)
    }
  })

  it('keeps autocapture off the admin and on everywhere else', async () => {
    const { ADMIN_URL } = await loadModule()
    for (const href of [
      'https://concertcrawl.app/admin',
      'https://concertcrawl.app/admin/users/user_2abc',
      'https://concertcrawl.app/admin?tab=x',
    ]) {
      expect(ADMIN_URL.test(href)).toBe(true)
    }
    for (const href of [
      'https://concertcrawl.app/',
      'https://concertcrawl.app/administrator',
      'https://concertcrawl.app/events/admin',
    ]) {
      expect(ADMIN_URL.test(href)).toBe(false)
    }
  })

  it('registers the short commit SHA and the app version as super-properties', async () => {
    process.env['NEXT_PUBLIC_POSTHOG_KEY'] = 'phc_test'
    process.env['NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA'] =
      '0123456789abcdef0123456789abcdef01234567'
    process.env['NEXT_PUBLIC_PACKAGE_VERSION'] = '1.300.5'
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    expect(mockRegister).toHaveBeenCalledWith({
      release: '0123456',
      app_version: '1.300.5',
    })
  })

  it('does not register super-properties when analytics is disabled', async () => {
    delete process.env['NEXT_PUBLIC_POSTHOG_KEY']
    const analytics = await loadModule()
    analytics.initAnalytics(PROD)
    expect(mockRegister).not.toHaveBeenCalled()
  })
})

describe('releaseProperties', () => {
  it('leaves off a property with no value', async () => {
    const { releaseProperties } = await import('./client')
    expect(releaseProperties('', undefined)).toEqual({})
    expect(releaseProperties(undefined, '1.0.0')).toEqual({
      app_version: '1.0.0',
    })
  })
})
