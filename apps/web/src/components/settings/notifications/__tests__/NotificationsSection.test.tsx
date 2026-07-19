// @vitest-environment jsdom

import React from 'react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Auth mock — never resolves undefined so getToken calls proceed.
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => 'test-token',
    isSignedIn: true,
    userId: 'user_test',
  }),
}))

// Preferences hook mocks — controlled per-test via mocks.
const useNotificationPreferencesMock = vi.fn()
const patchMutateAsyncMock = vi.fn().mockResolvedValue({
  masterEnabled: true,
  watchUpdatesEnabled: true,
  priceDropsEnabled: true,
})
const patchMutateMock = vi.fn()
vi.mock('@/lib/queries/use-notification-preferences', () => ({
  useNotificationPreferences: () => useNotificationPreferencesMock(),
  usePatchNotificationPreferences: () => ({
    mutate: patchMutateMock,
    mutateAsync: patchMutateAsyncMock,
  }),
  notificationPreferencesQueryKey: (userId: string) => [
    'notification-preferences',
    userId,
  ],
}))

// Push-client mocks — device state + subscribe / unsubscribe.
const getPushDeviceStateMock = vi.fn()
const subscribeToPushMock = vi.fn()
const unsubscribeFromPushMock = vi.fn()
vi.mock('@/lib/push/client', () => ({
  getPushDeviceState: () => getPushDeviceStateMock(),
  subscribeToPush: (token: string) => subscribeToPushMock(token),
  // Forward the optional knownId so tests can assert the rollback path
  // passes it (avoids the extra POST round-trip inside unsubscribeFromPush
  // when the caller already has the row id from subscribe).
  unsubscribeFromPush: (token: string, knownId?: string) =>
    unsubscribeFromPushMock(token, knownId),
}))

import { NotificationsSection } from '../NotificationsSection'

const withClient = (children: React.ReactNode) => {
  const client = new QueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  useNotificationPreferencesMock.mockReset()
  patchMutateAsyncMock.mockClear()
  patchMutateMock.mockClear()
  getPushDeviceStateMock.mockReset()
  subscribeToPushMock.mockReset()
  unsubscribeFromPushMock.mockReset()
  // Default: loaded, master off, sub-toggles default true, supported.
  useNotificationPreferencesMock.mockReturnValue({
    data: {
      masterEnabled: false,
      watchUpdatesEnabled: true,
      priceDropsEnabled: true,
    },
    isLoading: false,
  })
  getPushDeviceStateMock.mockResolvedValue({
    support: 'supported',
    permission: 'default',
    subscribed: false,
  })
})

describe('NotificationsSection', () => {
  it('renders a busy skeleton while the preferences query is loading', () => {
    useNotificationPreferencesMock.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    render(withClient(<NotificationsSection />))
    const busy = document.querySelector('[aria-busy="true"]')
    expect(busy).not.toBeNull()
  })

  it('renders the empty state when master is off and not subscribed', async () => {
    render(withClient(<NotificationsSection />))
    // Wait for the device state effect.
    await waitFor(() => {
      expect(screen.getByText(/no notifications yet/i)).not.toBeNull()
    })
    expect(
      screen.getByRole('button', { name: /turn on notifications/i }),
    ).not.toBeNull()
  })

  it('empty-state CTA triggers subscribeToPush and enables master on success', async () => {
    subscribeToPushMock.mockResolvedValue({
      status: 'subscribed',
      id: 'row-1',
    })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /turn on notifications/i }),
      ).not.toBeNull()
    })
    fireEvent.click(
      screen.getByRole('button', { name: /turn on notifications/i }),
    )
    await waitFor(() => {
      expect(subscribeToPushMock).toHaveBeenCalledWith('test-token')
      expect(patchMutateAsyncMock).toHaveBeenCalledWith({
        masterEnabled: true,
      })
    })
  })

  it('shows sub-toggles when master is on', async () => {
    useNotificationPreferencesMock.mockReturnValue({
      data: {
        masterEnabled: true,
        watchUpdatesEnabled: true,
        priceDropsEnabled: false,
      },
      isLoading: false,
    })
    getPushDeviceStateMock.mockResolvedValue({
      support: 'supported',
      permission: 'granted',
      subscribed: true,
    })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: /watch updates/i }),
      ).not.toBeNull()
      expect(
        screen.getByRole('switch', { name: /price drops/i }),
      ).not.toBeNull()
    })
    // Confirm sub-toggle initial states match the server pref.
    const watch = screen.getByRole('switch', { name: /watch updates/i })
    expect(watch.getAttribute('aria-checked')).toBe('true')
    const price = screen.getByRole('switch', { name: /price drops/i })
    expect(price.getAttribute('aria-checked')).toBe('false')
  })

  it('renders the denied state when browser permission is denied', async () => {
    useNotificationPreferencesMock.mockReturnValue({
      data: {
        masterEnabled: false,
        watchUpdatesEnabled: true,
        priceDropsEnabled: true,
      },
      isLoading: false,
    })
    getPushDeviceStateMock.mockResolvedValue({
      support: 'supported',
      permission: 'denied',
      subscribed: false,
    })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(screen.getByText(/notifications are blocked/i)).not.toBeNull()
    })
    // Unblock link is present.
    expect(
      screen.getByRole('link', { name: /how to unblock notifications/i }),
    ).not.toBeNull()
  })

  it('renders the iOS-needs-install hint when detection returns that state', async () => {
    getPushDeviceStateMock.mockResolvedValue({
      support: 'ios-needs-install',
      permission: 'unavailable',
      subscribed: false,
    })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByText(/on iphone, notifications only work/i),
      ).not.toBeNull()
    })
  })

  it('unsubscribes and patches master off when master is toggled off', async () => {
    useNotificationPreferencesMock.mockReturnValue({
      data: {
        masterEnabled: true,
        watchUpdatesEnabled: true,
        priceDropsEnabled: true,
      },
      isLoading: false,
    })
    getPushDeviceStateMock.mockResolvedValue({
      support: 'supported',
      permission: 'granted',
      subscribed: true,
    })
    unsubscribeFromPushMock.mockResolvedValue({ status: 'unsubscribed' })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: /push notifications/i }),
      ).not.toBeNull()
    })
    fireEvent.click(screen.getByRole('switch', { name: /push notifications/i }))
    await waitFor(() => {
      // Master-off has no known subscription id yet (the section only
      // learned the id from a subscribe call in the current session, which
      // didn't happen here) — undefined is expected as the second arg.
      expect(unsubscribeFromPushMock).toHaveBeenCalledWith(
        'test-token',
        undefined,
      )
      expect(patchMutateAsyncMock).toHaveBeenCalledWith({
        masterEnabled: false,
      })
    })
  })

  it('rolls back subscribe with the known row id when the enable PATCH throws', async () => {
    subscribeToPushMock.mockResolvedValue({
      status: 'subscribed',
      id: 'row-42',
    })
    patchMutateAsyncMock.mockRejectedValue(new Error('network down'))
    unsubscribeFromPushMock.mockResolvedValue({ status: 'unsubscribed' })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /turn on notifications/i }),
      ).not.toBeNull()
    })
    fireEvent.click(
      screen.getByRole('button', { name: /turn on notifications/i }),
    )
    await waitFor(() => {
      expect(unsubscribeFromPushMock).toHaveBeenCalledWith(
        'test-token',
        'row-42',
      )
    })
  })

  it('renders an enable-on-this-device CTA when master is on but this device has no subscription', async () => {
    useNotificationPreferencesMock.mockReturnValue({
      data: {
        masterEnabled: true,
        watchUpdatesEnabled: true,
        priceDropsEnabled: true,
      },
      isLoading: false,
    })
    getPushDeviceStateMock.mockResolvedValue({
      support: 'supported',
      permission: 'granted',
      subscribed: false,
    })
    subscribeToPushMock.mockResolvedValue({ status: 'subscribed', id: 'row-9' })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /enable on this device/i }),
      ).not.toBeNull()
    })
    fireEvent.click(
      screen.getByRole('button', { name: /enable on this device/i }),
    )
    await waitFor(() => {
      expect(subscribeToPushMock).toHaveBeenCalledWith('test-token')
    })
    // Server preference PATCH must NOT be called — master is already on,
    // and calling it again would be a no-op that could race with a
    // concurrent write from another device.
    expect(patchMutateAsyncMock).not.toHaveBeenCalled()
  })

  it('renders a dedicated error state when the preferences query fails', () => {
    useNotificationPreferencesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })
    render(withClient(<NotificationsSection />))
    const alert = screen.getByRole('alert')
    expect(alert).not.toBeNull()
    expect(alert.textContent).toMatch(/couldn't load|refresh/i)
    // The subscribe CTA must not be reachable in the error state — a click
    // through it could trigger a browser permission prompt on defaulted
    // prefs.
    expect(
      screen.queryByRole('button', { name: /turn on notifications/i }),
    ).toBeNull()
  })
})
