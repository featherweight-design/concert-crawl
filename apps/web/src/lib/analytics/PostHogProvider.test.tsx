// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

const { mockUseUser, initAnalytics, identifyUser, resetAnalyticsIdentity } =
  vi.hoisted(() => ({
    mockUseUser: vi.fn(),
    initAnalytics: vi.fn(),
    identifyUser: vi.fn(),
    resetAnalyticsIdentity: vi.fn(),
  }))

vi.mock('@clerk/nextjs', () => ({ useUser: mockUseUser }))
vi.mock('./client', () => ({
  initAnalytics,
  identifyUser,
  resetAnalyticsIdentity,
}))

import { PostHogProvider } from './PostHogProvider'

describe('PostHogProvider', () => {
  beforeEach(() => vi.clearAllMocks())

  it('identifies a signed-in user with their display name, never the email', () => {
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: {
        id: 'user_1',
        fullName: 'Ada Lovelace',
        username: 'ada',
        primaryEmailAddress: { emailAddress: 'ada@example.com' },
      },
    })
    render(<PostHogProvider>child</PostHogProvider>)
    expect(initAnalytics).toHaveBeenCalledTimes(1)
    expect(identifyUser).toHaveBeenCalledWith('user_1', 'Ada Lovelace')
    expect(resetAnalyticsIdentity).not.toHaveBeenCalled()
  })

  it('falls back to the username when there is no full name', () => {
    mockUseUser.mockReturnValue({
      isLoaded: true,
      user: { id: 'user_2', fullName: null, username: 'grace' },
    })
    render(<PostHogProvider>child</PostHogProvider>)
    expect(identifyUser).toHaveBeenCalledWith('user_2', 'grace')
  })

  it('resets the identity when signed out', () => {
    mockUseUser.mockReturnValue({ isLoaded: true, user: null })
    render(<PostHogProvider>child</PostHogProvider>)
    expect(resetAnalyticsIdentity).toHaveBeenCalledTimes(1)
    expect(identifyUser).not.toHaveBeenCalled()
  })

  it('starts nothing until Clerk has loaded', () => {
    mockUseUser.mockReturnValue({ isLoaded: false, user: undefined })
    render(<PostHogProvider>child</PostHogProvider>)
    expect(initAnalytics).not.toHaveBeenCalled()
    expect(identifyUser).not.toHaveBeenCalled()
    expect(resetAnalyticsIdentity).not.toHaveBeenCalled()
  })

  it('inits once Clerk loads and settles the identity right after', () => {
    mockUseUser.mockReturnValue({ isLoaded: false, user: undefined })
    const { rerender } = render(<PostHogProvider>child</PostHogProvider>)
    mockUseUser.mockReturnValue({ isLoaded: true, user: null })
    rerender(<PostHogProvider>child</PostHogProvider>)
    expect(initAnalytics).toHaveBeenCalledTimes(1)
    expect(resetAnalyticsIdentity).toHaveBeenCalledTimes(1)
    expect(initAnalytics.mock.invocationCallOrder[0]).toBeLessThan(
      resetAnalyticsIdentity.mock.invocationCallOrder[0] ?? 0,
    )
  })
})
