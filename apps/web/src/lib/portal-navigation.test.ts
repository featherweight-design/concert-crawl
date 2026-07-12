// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockCreatePortalSession = vi.fn()
vi.mock('@/lib/billing', () => ({
  createPortalSession: (token: string) => mockCreatePortalSession(token),
}))

import {
  navigateToPortalSession,
  openPortalSessionInNewTab,
} from './portal-navigation'

// jsdom defines location.assign as non-configurable, so vi.spyOn throws
// "Cannot redefine property: assign". Replacing the whole location object
// via Object.defineProperty is the only workable interception in jsdom.
const assignSpy = vi.fn()
const openSpy = vi.fn()
const originalLocation = window.location
const originalOpen = window.open

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...originalLocation, assign: assignSpy },
  })
  Object.defineProperty(window, 'open', { writable: true, value: openSpy })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: originalLocation,
  })
  Object.defineProperty(window, 'open', {
    writable: true,
    value: originalOpen,
  })
})

describe('navigateToPortalSession', () => {
  it('creates a portal session with the token and navigates to its URL', async () => {
    mockCreatePortalSession.mockResolvedValue({
      url: 'https://stripe.test/portal',
    })
    await navigateToPortalSession(() => Promise.resolve('test-token'))
    expect(mockCreatePortalSession).toHaveBeenCalledWith('test-token')
    expect(assignSpy).toHaveBeenCalledWith('https://stripe.test/portal')
  })

  it('throws when no auth token is available and never hits the API', async () => {
    await expect(
      navigateToPortalSession(() => Promise.resolve(null)),
    ).rejects.toThrow('Not authenticated')
    expect(mockCreatePortalSession).not.toHaveBeenCalled()
  })

  it.each([
    ['javascript: scheme', 'javascript:alert(1)'],
    ['http (non-https)', 'http://stripe.test/portal'],
  ])('refuses to navigate to a %s URL', async (_label, url) => {
    mockCreatePortalSession.mockResolvedValue({ url })
    await expect(
      navigateToPortalSession(() => Promise.resolve('test-token')),
    ).rejects.toThrow('non-HTTPS')
    expect(assignSpy).not.toHaveBeenCalled()
  })

  it('refuses to navigate to a relative or malformed URL', async () => {
    mockCreatePortalSession.mockResolvedValue({ url: '/relative/path' })
    await expect(
      navigateToPortalSession(() => Promise.resolve('test-token')),
    ).rejects.toThrow('malformed URL')
    expect(assignSpy).not.toHaveBeenCalled()
  })
})

describe('openPortalSessionInNewTab', () => {
  const makeFakeTab = () => ({
    opener: { anything: true },
    location: { href: 'about:blank' },
    close: vi.fn(),
  })

  it('opens a blank tab synchronously, then points it at the portal URL', async () => {
    const fakeTab = makeFakeTab()
    openSpy.mockReturnValue(fakeTab)
    mockCreatePortalSession.mockResolvedValue({
      url: 'https://stripe.test/portal',
    })
    await openPortalSessionInNewTab(() => Promise.resolve('test-token'))
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank')
    expect(fakeTab.opener).toBeNull()
    expect(fakeTab.location.href).toBe('https://stripe.test/portal')
    expect(assignSpy).not.toHaveBeenCalled()
  })

  it('falls back to same-tab navigation when the popup is blocked', async () => {
    openSpy.mockReturnValue(null)
    mockCreatePortalSession.mockResolvedValue({
      url: 'https://stripe.test/portal',
    })
    await openPortalSessionInNewTab(() => Promise.resolve('test-token'))
    expect(assignSpy).toHaveBeenCalledWith('https://stripe.test/portal')
  })

  it('closes the blank tab and rethrows when the session fails', async () => {
    const fakeTab = makeFakeTab()
    openSpy.mockReturnValue(fakeTab)
    mockCreatePortalSession.mockRejectedValue(new Error('stripe down'))
    await expect(
      openPortalSessionInNewTab(() => Promise.resolve('test-token')),
    ).rejects.toThrow('stripe down')
    expect(fakeTab.close).toHaveBeenCalledTimes(1)
    expect(fakeTab.location.href).toBe('about:blank')
  })

  it('closes the blank tab on a non-https portal URL', async () => {
    const fakeTab = makeFakeTab()
    openSpy.mockReturnValue(fakeTab)
    mockCreatePortalSession.mockResolvedValue({ url: 'javascript:alert(1)' })
    await expect(
      openPortalSessionInNewTab(() => Promise.resolve('test-token')),
    ).rejects.toThrow('non-HTTPS')
    expect(fakeTab.close).toHaveBeenCalledTimes(1)
    expect(fakeTab.location.href).toBe('about:blank')
  })
})
