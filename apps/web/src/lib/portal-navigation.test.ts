// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreatePortalSession = vi.fn()
vi.mock('./billing', () => ({
  createPortalSession: (token: string) => mockCreatePortalSession(token),
}))

import { navigateToPortalSession } from './portal-navigation'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('navigateToPortalSession', () => {
  it('creates a portal session with the token and navigates to its URL', async () => {
    mockCreatePortalSession.mockResolvedValue({
      url: 'https://stripe.test/portal',
    })
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, assign: assignSpy },
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
})
