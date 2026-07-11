// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockCreatePortalSession = vi.fn()
vi.mock('@/lib/billing', () => ({
  createPortalSession: (token: string) => mockCreatePortalSession(token),
}))

import { navigateToPortalSession } from './portal-navigation'

// jsdom defines location.assign as non-configurable, so vi.spyOn throws
// "Cannot redefine property: assign". Replacing the whole location object
// via Object.defineProperty is the only workable interception in jsdom.
const assignSpy = vi.fn()
const originalLocation = window.location

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...originalLocation, assign: assignSpy },
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: originalLocation,
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
    ).rejects.toThrow()
    expect(assignSpy).not.toHaveBeenCalled()
  })
})
