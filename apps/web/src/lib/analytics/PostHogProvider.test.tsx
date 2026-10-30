// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const {
  mockUseUser,
  mockGetToken,
  mockFetchMe,
  initAnalytics,
  identifyUser,
  isAnalyticsEnabled,
  resetAnalyticsIdentity,
  setPersonName,
} = vi.hoisted(() => ({
  mockUseUser: vi.fn(),
  mockGetToken: vi.fn(),
  mockFetchMe: vi.fn(),
  initAnalytics: vi.fn(),
  identifyUser: vi.fn(),
  isAnalyticsEnabled: vi.fn(),
  resetAnalyticsIdentity: vi.fn(),
  setPersonName: vi.fn(),
}))

vi.mock('@clerk/nextjs', () => ({
  useUser: mockUseUser,
  useAuth: () => ({ getToken: mockGetToken }),
}))
vi.mock('@/lib/users', () => ({ fetchMe: mockFetchMe }))
vi.mock('./client', () => ({
  initAnalytics,
  identifyUser,
  isAnalyticsEnabled,
  resetAnalyticsIdentity,
  setPersonName,
}))

import { PostHogProvider, analyticsHandleQueryKey } from './PostHogProvider'

const ADA = {
  id: 'user_1',
  fullName: 'Ada Lovelace',
  username: 'ada',
  primaryEmailAddress: { emailAddress: 'ada@example.com' },
}

const renderProvider = () => {
  const client = new QueryClient()
  const tree = () => (
    <QueryClientProvider client={client}>
      <PostHogProvider>child</PostHogProvider>
    </QueryClientProvider>
  )
  const result = render(tree())
  return { ...result, rerenderTree: () => result.rerender(tree()) }
}

describe('PostHogProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAnalyticsEnabled.mockReturnValue(true)
    mockGetToken.mockResolvedValue('token')
  })

  it('identifies a signed-in user, then names them by their profile handle', async () => {
    mockUseUser.mockReturnValue({ isLoaded: true, user: ADA })
    mockFetchMe.mockResolvedValue({ handle: 'adal' })
    renderProvider()
    expect(initAnalytics).toHaveBeenCalledTimes(1)
    expect(identifyUser).toHaveBeenCalledWith('user_1')
    await waitFor(() => expect(setPersonName).toHaveBeenCalledWith('adal'))
    expect(mockFetchMe).toHaveBeenCalledWith('token')
    expect(resetAnalyticsIdentity).not.toHaveBeenCalled()
  })

  it("never sends Clerk's full name, username or email", async () => {
    mockUseUser.mockReturnValue({ isLoaded: true, user: ADA })
    mockFetchMe.mockResolvedValue({ handle: 'adal' })
    renderProvider()
    await waitFor(() => expect(setPersonName).toHaveBeenCalledTimes(1))
    const sent = JSON.stringify([
      ...identifyUser.mock.calls,
      ...setPersonName.mock.calls,
    ])
    expect(sent).not.toContain('Ada Lovelace')
    expect(sent).not.toContain('"ada"')
    expect(sent).not.toContain('ada@example.com')
  })

  it('removes the name for a reader without a handle', async () => {
    mockUseUser.mockReturnValue({ isLoaded: true, user: ADA })
    mockFetchMe.mockResolvedValue({ handle: null })
    renderProvider()
    await waitFor(() => expect(setPersonName).toHaveBeenCalledWith(null))
    expect(identifyUser).toHaveBeenCalledTimes(1)
    expect(identifyUser).toHaveBeenCalledWith('user_1')
  })

  it('follows a handle saved while the provider stays mounted, a cleared one included', async () => {
    mockUseUser.mockReturnValue({ isLoaded: true, user: ADA })
    mockFetchMe.mockResolvedValue({ handle: 'adal' })
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <PostHogProvider>child</PostHogProvider>
      </QueryClientProvider>,
    )
    await waitFor(() => expect(setPersonName).toHaveBeenLastCalledWith('adal'))
    // What EditProfileForm writes after a successful save.
    act(() => client.setQueryData(analyticsHandleQueryKey('user_1'), 'ada2'))
    await waitFor(() => expect(setPersonName).toHaveBeenLastCalledWith('ada2'))
    act(() => client.setQueryData(analyticsHandleQueryKey('user_1'), null))
    await waitFor(() => expect(setPersonName).toHaveBeenLastCalledWith(null))
    expect(mockFetchMe).toHaveBeenCalledTimes(1)
  })

  it('leaves the name alone when the profile cannot be read', async () => {
    mockUseUser.mockReturnValue({ isLoaded: true, user: ADA })
    mockFetchMe.mockRejectedValue(new Error('network'))
    renderProvider()
    await waitFor(() => expect(mockFetchMe).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(setPersonName).not.toHaveBeenCalled()
  })

  it('does not fetch the profile when analytics is off', async () => {
    isAnalyticsEnabled.mockReturnValue(false)
    mockUseUser.mockReturnValue({ isLoaded: true, user: ADA })
    renderProvider()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(mockFetchMe).not.toHaveBeenCalled()
    expect(setPersonName).not.toHaveBeenCalled()
  })

  it('resets the identity when signed out', () => {
    mockUseUser.mockReturnValue({ isLoaded: true, user: null })
    renderProvider()
    expect(resetAnalyticsIdentity).toHaveBeenCalledTimes(1)
    expect(identifyUser).not.toHaveBeenCalled()
    expect(mockFetchMe).not.toHaveBeenCalled()
  })

  it('starts nothing until Clerk has loaded', () => {
    mockUseUser.mockReturnValue({ isLoaded: false, user: undefined })
    renderProvider()
    expect(initAnalytics).not.toHaveBeenCalled()
    expect(identifyUser).not.toHaveBeenCalled()
    expect(resetAnalyticsIdentity).not.toHaveBeenCalled()
  })

  it('inits once Clerk loads and settles the identity right after', () => {
    mockUseUser.mockReturnValue({ isLoaded: false, user: undefined })
    const { rerenderTree } = renderProvider()
    mockUseUser.mockReturnValue({ isLoaded: true, user: null })
    rerenderTree()
    expect(initAnalytics).toHaveBeenCalledTimes(1)
    expect(resetAnalyticsIdentity).toHaveBeenCalledTimes(1)
    expect(initAnalytics.mock.invocationCallOrder[0]).toBeLessThan(
      resetAnalyticsIdentity.mock.invocationCallOrder[0] ?? 0,
    )
  })
})
