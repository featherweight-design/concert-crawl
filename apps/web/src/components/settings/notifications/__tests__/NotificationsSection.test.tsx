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
import type { PlanState } from '@concert-crawl/types'

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

// The tier picker reaches for the app router, which jsdom has no provider for.
// Every sibling suite that renders a locked surface stubs it the same way.
vi.mock('@/components/consumer/tier-picker/lazy', () => ({
  TierPickerSheet: ({ open, entry }: { open: boolean; entry: string }) =>
    open ? <div data-testid="tier-picker" data-entry={entry} /> : null,
}))

// Plan state drives the artist-group lock. The default is a Premium member so
// the pre-existing push assertions see live switches; locked tests override it.
const usePlanStateMock = vi.fn()
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => usePlanStateMock(),
}))

const useSpotifyConnectionMock = vi.fn()
vi.mock('@/lib/queries/use-spotify-connection', () => ({
  useSpotifyConnection: () => useSpotifyConnectionMock(),
}))

import { NotificationsSection } from '../NotificationsSection'
import { NOTIFICATIONS_COPY } from '../definitions/copy'

const ARTISTS = NOTIFICATIONS_COPY.artists

const withClient = (children: React.ReactNode) => {
  const client = new QueryClient()
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const planOn = (plan: PlanState['plan']): PlanState => ({
  plan,
  onTrial: false,
  trialEndsAt: null,
  status: 'active',
  cancelAtPeriodEnd: false,
  currentPeriodEnd: null,
  roleComped: false,
})

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
  usePlanStateMock.mockReset()
  useSpotifyConnectionMock.mockReset()
  // Default: loaded, master off, sub-toggles default true, supported.
  useNotificationPreferencesMock.mockReturnValue({
    data: {
      masterEnabled: false,
      watchUpdatesEnabled: true,
      priceDropsEnabled: true,
      artistAlertsEnabled: true,
      artistAutoWatch: false,
      weeklyDigestEnabled: true,
      productEmailsEnabled: true,
    },
    isLoading: false,
  })
  // Premium by default so the artist group renders unlocked; the locked tests
  // drop the plan back to free or supporter themselves.
  usePlanStateMock.mockReturnValue({
    data: planOn('premium'),
    isPending: false,
  })
  useSpotifyConnectionMock.mockReturnValue({ data: undefined })
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

  it('surfaces a visible error banner when the subscribe pipeline returns { status: "error" } (#1130)', async () => {
    // The exact bug that produced "toggle does nothing" on Brave: the
    // server returned 503 because VAPID wasn't configured, subscribeToPush
    // resolved to { status: 'error' }, and the previous code silently
    // skipped the PATCH. This test guards against reverting to that.
    // Start in the "master off + device already subscribed" state so the
    // master toggle renders (the empty-state gate `!masterOn &&
    // !deviceState.subscribed` short-circuits to the CTA when both are
    // false — we want the toggle path so clicking it exercises
    // onToggleMaster(false→true→error).
    useNotificationPreferencesMock.mockReturnValue({
      data: {
        masterEnabled: false,
        watchUpdatesEnabled: true,
        priceDropsEnabled: true,
      },
      isLoading: false,
    })
    // A live subscription so the empty-state gate (`!masterOn &&
    // !deviceState.subscribed`) doesn't render the empty CTA — we want
    // the master toggle for this test.
    getPushDeviceStateMock.mockResolvedValue({
      support: 'supported',
      permission: 'granted',
      subscribed: true,
    })
    subscribeToPushMock.mockResolvedValue({ status: 'error' })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: /push notifications/i }),
      ).not.toBeNull()
    })
    fireEvent.click(screen.getByRole('switch', { name: /push notifications/i }))
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).not.toBeNull()
      expect(alert.textContent).toMatch(/didn't accept|try again/i)
    })
    // The PATCH must NOT have fired — we don't want to write master=true
    // when the subscribe failed.
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

// ── Artists you follow (native following, PR 2) ────────────────────────────
//
// The two guarantees with teeth here:
//   1. A locked user gets ONE card, never three dead switches. A switch that
//      does nothing is worse than no switch, and the card carries the only
//      upgrade route on this screen.
//   2. The weekly digest is an EMAIL, so its switch stays reachable with push
//      switched fully off. Same reasoning that keeps crew activity outside the
//      master, and the reason the group is hoisted out of the push branches.
describe('NotificationsSection — Artists you follow', () => {
  const masterOn = () => {
    useNotificationPreferencesMock.mockReturnValue({
      data: {
        masterEnabled: true,
        watchUpdatesEnabled: true,
        priceDropsEnabled: true,
        artistAlertsEnabled: true,
        artistAutoWatch: false,
        weeklyDigestEnabled: true,
        productEmailsEnabled: true,
      },
      isLoading: false,
    })
    getPushDeviceStateMock.mockResolvedValue({
      support: 'supported',
      permission: 'granted',
      subscribed: true,
    })
  }

  it('renders all three rows for a premium member with push on', async () => {
    masterOn()
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: ARTISTS.alerts.label }),
      ).not.toBeNull()
    })
    expect(
      screen.getByRole('switch', { name: ARTISTS.autoWatch.label }),
    ).not.toBeNull()
    expect(
      screen.getByRole('switch', { name: ARTISTS.digest.label }),
    ).not.toBeNull()
    expect(screen.getByText(ARTISTS.heading)).not.toBeNull()
  })

  it('orders the artist group above the watch group (announce → watch → price)', async () => {
    masterOn()
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(screen.getByText(ARTISTS.heading)).not.toBeNull()
    })
    const artists = screen.getByText(ARTISTS.heading)
    const watching = screen.getByText(NOTIFICATIONS_COPY.watching.heading)
    // Node.DOCUMENT_POSITION_FOLLOWING === 4 — `watching` comes after.
    expect(artists.compareDocumentPosition(watching) & 4).toBeTruthy()
  })

  it('describes each switch by its body line, not just its title', async () => {
    masterOn()
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: ARTISTS.alerts.label }),
      ).not.toBeNull()
    })
    const alerts = screen.getByRole('switch', { name: ARTISTS.alerts.label })
    const describedBy = alerts.getAttribute('aria-describedby')
    expect(describedBy).not.toBeNull()
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
      ARTISTS.alerts.detail,
    )
  })

  it('patches only the flipped key, leaving the other preferences alone', async () => {
    masterOn()
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: ARTISTS.autoWatch.label }),
      ).not.toBeNull()
    })
    fireEvent.click(
      screen.getByRole('switch', { name: ARTISTS.autoWatch.label }),
    )
    await waitFor(() => {
      expect(patchMutateMock).toHaveBeenCalled()
    })
    // Partial PATCH is the contract: an absent key means "leave it alone", so
    // sending the whole object would silently re-assert stale values from
    // another device.
    expect(patchMutateMock.mock.calls[0]?.[0]).toEqual({
      artistAutoWatch: true,
    })
  })

  it('keeps the weekly digest reachable with push fully off — it is an email', async () => {
    // Default beforeEach state: master off, nothing subscribed.
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: ARTISTS.digest.label }),
      ).not.toBeNull()
    })
    // The two push rows DO gate on the master, and stay hidden.
    expect(
      screen.queryByRole('switch', { name: ARTISTS.alerts.label }),
    ).toBeNull()
    expect(
      screen.queryByRole('switch', { name: ARTISTS.autoWatch.label }),
    ).toBeNull()
  })

  it.each(['free', 'supporter'] as const)(
    'shows one locked card and zero artist switches on %s',
    async (plan) => {
      masterOn()
      usePlanStateMock.mockReturnValue({
        data: planOn(plan),
        isPending: false,
      })
      render(withClient(<NotificationsSection />))
      await waitFor(() => {
        expect(screen.getByText(ARTISTS.locked.detail)).not.toBeNull()
      })
      for (const label of [
        ARTISTS.alerts.label,
        ARTISTS.autoWatch.label,
        ARTISTS.digest.label,
      ]) {
        expect(screen.queryByRole('switch', { name: label })).toBeNull()
      }
    },
  )

  it('opens the tier picker from the locked card CTA', async () => {
    usePlanStateMock.mockReturnValue({
      data: planOn('free'),
      isPending: false,
    })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: ARTISTS.locked.cta }),
      ).not.toBeNull()
    })
    expect(screen.queryByTestId('tier-picker')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: ARTISTS.locked.cta }))
    expect(screen.getByTestId('tier-picker')).not.toBeNull()
  })

  it('stays locked while the plan is still unknown, so no switch flashes', async () => {
    masterOn()
    usePlanStateMock.mockReturnValue({ data: undefined, isPending: false })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(screen.getByText(ARTISTS.locked.detail)).not.toBeNull()
    })
  })

  it('shows the Spotify note only once a connection exists', async () => {
    masterOn()
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: ARTISTS.digest.label }),
      ).not.toBeNull()
    })
    expect(screen.queryByText(ARTISTS.spotifyNote)).toBeNull()

    cleanup()
    useSpotifyConnectionMock.mockReturnValue({ data: { status: 'connected' } })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(screen.getByText(ARTISTS.spotifyNote)).not.toBeNull()
    })
  })

  it('surfaces a visible banner when a preference patch fails', async () => {
    masterOn()
    // The sub-toggle path uses mutate() with an inline onError, so the failure
    // has to be delivered through the callback rather than a rejected promise.
    patchMutateMock.mockImplementationOnce(
      (
        _updates: unknown,
        options?: { onError?: (err: Error) => void },
      ): void => {
        options?.onError?.(new Error('network down'))
      },
    )
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: ARTISTS.digest.label }),
      ).not.toBeNull()
    })
    fireEvent.click(screen.getByRole('switch', { name: ARTISTS.digest.label }))
    await waitFor(() => {
      expect(
        screen.getByText(NOTIFICATIONS_COPY.toggleError.preference),
      ).not.toBeNull()
    })
  })
})

// ── Email from us (#1572) ──────────────────────────────────────────────────
//
// The guarantees with teeth: the switch is reachable with push fully off AND
// on a free plan, because it governs an email family and it is an opt-out we
// are obliged to offer. Nothing about billing mail gets a switch.
describe('NotificationsSection — Email from us', () => {
  const PRODUCT = NOTIFICATIONS_COPY.productEmail

  it('renders the switch with push off and on a free plan', async () => {
    usePlanStateMock.mockReturnValue({ data: planOn('free'), isPending: false })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: PRODUCT.label })).not.toBeNull()
    })
    expect(screen.getByText(PRODUCT.heading)).not.toBeNull()
    expect(screen.getByText(PRODUCT.billingFootnote)).not.toBeNull()
  })

  // The payload is the assertion. The detail line is driven by server state,
  // which the mocked mutation never advances, so it is covered by the
  // already-off case below rather than by clicking here.
  it('patches productEmailsEnabled alone, naming no other switch', async () => {
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: PRODUCT.label })).not.toBeNull()
    })
    expect(screen.getByText(PRODUCT.onDetail)).not.toBeNull()

    fireEvent.click(screen.getByRole('switch', { name: PRODUCT.label }))
    expect(patchMutateMock).toHaveBeenCalledWith(
      { productEmailsEnabled: false },
      expect.anything(),
    )
  })

  it('reads off when the one-click link already unsubscribed the user', async () => {
    useNotificationPreferencesMock.mockReturnValue({
      data: {
        masterEnabled: false,
        watchUpdatesEnabled: true,
        priceDropsEnabled: true,
        artistAlertsEnabled: true,
        artistAutoWatch: false,
        weeklyDigestEnabled: true,
        productEmailsEnabled: false,
      },
      isLoading: false,
    })
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(screen.getByText(PRODUCT.offDetail)).not.toBeNull()
    })
    expect(
      screen
        .getByRole('switch', { name: PRODUCT.label })
        .getAttribute('aria-checked'),
    ).toBe('false')
  })
})
