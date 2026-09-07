// @vitest-environment jsdom
//
// Settings ▸ Notifications ▸ Crew activity (#1226 PR-7).
//
// The two guarantees with teeth:
//   1. The control is a REAL button — focusable, and togglable with Space. A
//      previous round in this codebase shipped a `<span role="switch">` that no
//      keyboard could reach, which is why this is asserted rather than assumed.
//   2. The block renders with push fully OFF. Crew activity is bell-only, so
//      gating it behind the push master switch would make it unreachable.

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

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: async () => 'test-token',
    isSignedIn: true,
    userId: 'user_test',
  }),
}))

const useCrewsMock = vi.fn()
const muteMutateMock = vi.fn()
vi.mock('@/lib/queries/use-crew-mutes', () => ({
  useCrews: () => useCrewsMock(),
  useCrewMuteToggle: () => ({ mutate: muteMutateMock, isPending: false }),
}))

// The push half of the section is not under test here, but NotificationsSection
// imports it, so it is stubbed to its off-and-loaded state.
const useNotificationPreferencesMock = vi.fn()
vi.mock('@/lib/queries/use-notification-preferences', () => ({
  useNotificationPreferences: () => useNotificationPreferencesMock(),
  usePatchNotificationPreferences: () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  }),
}))

vi.mock('@/lib/push/client', () => ({
  getPushDeviceState: async () => ({
    support: 'supported',
    permission: 'default',
    subscribed: false,
  }),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}))

// Likewise the artist group: not under test here, but NotificationsSection
// renders it, and the tier picker it mounts reaches for the app router, which
// jsdom has no provider for.
vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined, isPending: false }),
}))
vi.mock('@/lib/queries/use-spotify-connection', () => ({
  useSpotifyConnection: () => ({ data: undefined }),
}))
vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: () => null,
}))

// Hoisted: `vi.mock` runs before module-scope consts, so the spy has to be
// created inside the hoisted block to be visible to the factory.
const { useFeatureFlag } = vi.hoisted(() => ({ useFeatureFlag: vi.fn() }))
vi.mock('@/lib/queries/use-feature-flags', () => ({ useFeatureFlag }))

import { CrewActivityBlock } from '../CrewActivityBlock'
import { NotificationsSection } from '../NotificationsSection'
import { NOTIFICATIONS_COPY } from '../definitions/copy'

const COPY = NOTIFICATIONS_COPY.crew

const withClient = (children: React.ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const crew = (over: Record<string, unknown> = {}) => ({
  id: 'crew-1',
  name: 'The Regulars',
  patchSalt: 3,
  memberCount: 4,
  members: [],
  upcomingCount: 2,
  isKeeper: false,
  muted: false,
  ...over,
})

afterEach(cleanup)

beforeEach(() => {
  useCrewsMock.mockReset()
  muteMutateMock.mockReset()
  useNotificationPreferencesMock.mockReset()
  // On by default, so every pre-flag assertion below keeps asserting the
  // behaviour it was written for.
  useFeatureFlag.mockReturnValue({ isLoading: false, enabled: true })
  useCrewsMock.mockReturnValue({
    data: [crew()],
    isLoading: false,
    isError: false,
  })
  useNotificationPreferencesMock.mockReturnValue({
    data: {
      masterEnabled: false,
      watchUpdatesEnabled: true,
      priceDropsEnabled: true,
    },
    isLoading: false,
    isError: false,
  })
})

describe('CrewActivityBlock', () => {
  it('renders one switch per crew, on when the crew is not muted', () => {
    render(withClient(<CrewActivityBlock />))
    const control = screen.getByRole('switch', {
      name: COPY.rowLabel('The Regulars'),
    })
    expect(control.getAttribute('aria-checked')).toBe('true')
    expect(screen.getByText(COPY.on)).not.toBeNull()
  })

  it('shows a muted crew as off', () => {
    useCrewsMock.mockReturnValue({
      data: [crew({ muted: true })],
      isLoading: false,
      isError: false,
    })
    render(withClient(<CrewActivityBlock />))
    const control = screen.getByRole('switch', {
      name: COPY.rowLabel('The Regulars'),
    })
    expect(control.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText(COPY.off)).not.toBeNull()
  })

  it('the control is a real button that can take focus', () => {
    render(withClient(<CrewActivityBlock />))
    const control = screen.getByRole('switch', {
      name: COPY.rowLabel('The Regulars'),
    })
    // A `<span role="switch">` passes the role query and fails both of these.
    expect(control.tagName).toBe('BUTTON')
    expect(control.getAttribute('type')).toBe('button')
    control.focus()
    expect(document.activeElement).toBe(control)
  })

  it('toggles on Space, mutes the crew, and never mutes on a bare focus', () => {
    render(withClient(<CrewActivityBlock />))
    const control = screen.getByRole('switch', {
      name: COPY.rowLabel('The Regulars'),
    })
    control.focus()
    expect(muteMutateMock).not.toHaveBeenCalled()
    // jsdom does not synthesise the click a native button fires on Space, so
    // the keypress and the resulting activation are both driven here. The
    // point of the assertion is that the element is one a browser WOULD
    // activate — a span never gets that click at all.
    fireEvent.keyDown(control, { key: ' ', code: 'Space' })
    fireEvent.keyUp(control, { key: ' ', code: 'Space' })
    fireEvent.click(control)
    expect(muteMutateMock).toHaveBeenCalledWith({
      crewId: 'crew-1',
      muted: true,
    })
  })

  it('unmutes a muted crew when switched back on', () => {
    useCrewsMock.mockReturnValue({
      data: [crew({ muted: true })],
      isLoading: false,
      isError: false,
    })
    render(withClient(<CrewActivityBlock />))
    fireEvent.click(
      screen.getByRole('switch', { name: COPY.rowLabel('The Regulars') }),
    )
    expect(muteMutateMock).toHaveBeenCalledWith({
      crewId: 'crew-1',
      muted: false,
    })
  })

  it('says so when the user is in no crews', () => {
    useCrewsMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })
    render(withClient(<CrewActivityBlock />))
    expect(screen.getByText(COPY.empty)).not.toBeNull()
    expect(screen.queryByRole('switch')).toBeNull()
  })

  it('degrades to a quiet message when the crews query fails', () => {
    useCrewsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })
    render(withClient(<CrewActivityBlock />))
    expect(screen.getByText(COPY.loadError)).not.toBeNull()
    // Not an alert: the push half owns the section's single live region.
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('CrewActivityBlock inside NotificationsSection', () => {
  it('renders with push fully off — crew activity is bell-only', async () => {
    render(withClient(<NotificationsSection />))
    await waitFor(() => {
      expect(screen.getByText(NOTIFICATIONS_COPY.empty.title)).not.toBeNull()
    })
    // The push sub-toggles are gated on master; crew rows are not.
    expect(screen.queryByRole('switch', { name: 'Watch updates' })).toBeNull()
    expect(
      screen.getByRole('switch', { name: COPY.rowLabel('The Regulars') }),
    ).not.toBeNull()
  })

  it('renders nothing with crews off, on every NotificationsSection branch', () => {
    useFeatureFlag.mockReturnValue({ isLoading: false, enabled: false })
    useNotificationPreferencesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })
    render(withClient(<NotificationsSection />))
    expect(screen.queryByText(COPY.heading)).toBeNull()
  })

  it('survives a preferences outage', () => {
    useNotificationPreferencesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    })
    render(withClient(<NotificationsSection />))
    expect(
      screen.getByRole('switch', { name: COPY.rowLabel('The Regulars') }),
    ).not.toBeNull()
  })
})
