// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SpotifyConnectionView } from '@concert-crawl/types'
import { ApiError } from '@/lib/api'

interface MutationStub {
  mutate: ReturnType<typeof vi.fn>
  isPending: boolean
  error: unknown
}

const makeMutation = (): MutationStub => ({
  mutate: vi.fn(),
  isPending: false,
  error: null,
})

interface PushToggleStub extends MutationStub {
  data:
    | { ok: true }
    | { ok: false; reason: 'permission-denied' | 'unsupported' | 'error' }
    | undefined
}

interface PushDeviceStateStub {
  data:
    | {
        support: 'supported' | 'ios-needs-install' | 'unsupported'
        permission: 'granted' | 'denied' | 'default' | 'unavailable'
        subscribed: boolean
      }
    | undefined
}

let syncMutation: MutationStub
let patchMutation: MutationStub
let disconnectMutation: MutationStub
let pushToggleMutation: PushToggleStub
let pushDeviceState: PushDeviceStateStub

vi.mock('@/lib/queries/use-spotify-connection', () => ({
  spotifyConnectionQueryKeyBase: ['spotify-connection'],
  spotifyConnectionQueryKey: (userId: string | null | undefined) => [
    'spotify-connection',
    userId ?? null,
  ],
  useSpotifySync: () => syncMutation,
  useSpotifyPatch: () => patchMutation,
  useSpotifyDisconnect: () => disconnectMutation,
}))

vi.mock('@/lib/queries/use-push-toggle', () => ({
  usePushDeviceState: () => pushDeviceState,
  usePushToggle: () => pushToggleMutation,
}))

beforeEach(() => {
  vi.clearAllMocks()
  syncMutation = makeMutation()
  patchMutation = makeMutation()
  disconnectMutation = makeMutation()
  pushToggleMutation = { ...makeMutation(), data: undefined }
  pushDeviceState = {
    data: { support: 'supported', permission: 'granted', subscribed: false },
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

import { ConnectedCard } from './ConnectedCard'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'

const CARD_COPY = SPOTIFY_COPY.connectedCard
const CONFIRM_COPY = SPOTIFY_COPY.disconnectConfirm

const CONNECTION: SpotifyConnectionView = {
  status: 'connected',
  displayName: 'maya.k',
  artistCount: 34,
  lastSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  autoWatch: false,
  digestEnabled: true,
  pushEnabled: false,
  denverArtistCount: 9,
  denverShowCount: 12,
  matchedArtists: ['Wednesday', 'Geese'],
}

const renderCard = (overrides: Partial<SpotifyConnectionView> = {}) =>
  render(<ConnectedCard connection={{ ...CONNECTION, ...overrides }} />)

describe('ConnectedCard', () => {
  it('renders the linked pill, account line, counts and last-synced time', () => {
    renderCard()
    expect(screen.getByText(CARD_COPY.linkedPill)).toBeTruthy()
    expect(screen.getByText('maya.k · spotify.com')).toBeTruthy()
    expect(screen.getByText(/9 play Denver/)).toBeTruthy()
    expect(screen.getByText('2 hours ago')).toBeTruthy()
    expect(screen.getByText(CARD_COPY.footerIdle)).toBeTruthy()
  })

  it('triggers a sync from the refresh action', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: CARD_COPY.refreshCta }))
    expect(syncMutation.mutate).toHaveBeenCalledTimes(1)
  })

  it('shows the syncing spinner row and refreshing footer while a sync is in flight', () => {
    syncMutation.isPending = true
    renderCard()
    expect(screen.getAllByText(CARD_COPY.syncingValue).length).toBeGreaterThan(
      0,
    )
    expect(screen.getByText(CARD_COPY.footerRefreshing)).toBeTruthy()
  })

  it('surfaces the rate-limited message on a 429 sync failure', () => {
    syncMutation.error = new ApiError(429, 'Too many requests')
    renderCard()
    expect(screen.getByText(CARD_COPY.rateLimited)).toBeTruthy()
  })

  it('patches autoWatch from the switch', () => {
    renderCard()
    fireEvent.click(
      screen.getByRole('switch', { name: CARD_COPY.autoWatchAria }),
    )
    expect(patchMutation.mutate).toHaveBeenCalledWith({ autoWatch: true })
  })

  it('opens the disconnect confirm sheet and only disconnects on explicit confirm', () => {
    renderCard()
    fireEvent.click(
      screen.getByRole('button', { name: CARD_COPY.disconnectCta }),
    )
    expect(
      screen.getByRole('dialog', { name: CONFIRM_COPY.ariaLabel }),
    ).toBeTruthy()
    for (const bullet of CONFIRM_COPY.bullets) {
      expect(
        screen.getByText(new RegExp(bullet.head.slice(0, -1))),
      ).toBeTruthy()
    }
    expect(disconnectMutation.mutate).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', { name: CONFIRM_COPY.confirmCta }),
    )
    expect(disconnectMutation.mutate).toHaveBeenCalledTimes(1)
  })

  describe('push toggle', () => {
    const getPushSwitch = () =>
      screen.getByRole('switch', { name: CARD_COPY.pushAria })

    it('shows OFF and toggles on when supported, granted and unsubscribed', () => {
      renderCard({ pushEnabled: true })
      const pushSwitch = getPushSwitch()
      expect(pushSwitch.getAttribute('aria-checked')).toBe('false')
      fireEvent.click(pushSwitch)
      expect(pushToggleMutation.mutate).toHaveBeenCalledWith(true)
    })

    it('shows ON and toggles off when the preference is on and the device is subscribed', () => {
      pushDeviceState.data = {
        support: 'supported',
        permission: 'granted',
        subscribed: true,
      }
      renderCard({ pushEnabled: true })
      const pushSwitch = getPushSwitch()
      expect(pushSwitch.getAttribute('aria-checked')).toBe('true')
      fireEvent.click(pushSwitch)
      expect(pushToggleMutation.mutate).toHaveBeenCalledWith(false)
    })

    it('shows OFF when subscribed but the server preference is off', () => {
      pushDeviceState.data = {
        support: 'supported',
        permission: 'granted',
        subscribed: true,
      }
      renderCard({ pushEnabled: false })
      expect(getPushSwitch().getAttribute('aria-checked')).toBe('false')
    })

    it('disables the switch and explains re-enabling when permission is denied', () => {
      pushDeviceState.data = {
        support: 'supported',
        permission: 'denied',
        subscribed: false,
      }
      renderCard()
      expect(getPushSwitch().hasAttribute('disabled')).toBe(true)
      expect(screen.getByText(CARD_COPY.pushDenied)).toBeTruthy()
      fireEvent.click(getPushSwitch())
      expect(pushToggleMutation.mutate).not.toHaveBeenCalled()
    })

    it('disables the switch with a note on unsupported browsers', () => {
      pushDeviceState.data = {
        support: 'unsupported',
        permission: 'unavailable',
        subscribed: false,
      }
      renderCard()
      expect(getPushSwitch().hasAttribute('disabled')).toBe(true)
      expect(screen.getByText(CARD_COPY.pushUnsupported)).toBeTruthy()
    })

    it('shows the Add-to-Home-Screen note on iOS Safari outside the installed PWA', () => {
      pushDeviceState.data = {
        support: 'ios-needs-install',
        permission: 'unavailable',
        subscribed: false,
      }
      renderCard()
      expect(getPushSwitch().hasAttribute('disabled')).toBe(true)
      expect(screen.getByText(CARD_COPY.pushIosInstall)).toBeTruthy()
    })

    it('disables the switch while the device state is still resolving', () => {
      pushDeviceState.data = undefined
      renderCard()
      expect(getPushSwitch().hasAttribute('disabled')).toBe(true)
    })

    it('disables the switch while a toggle is in flight', () => {
      pushToggleMutation.isPending = true
      renderCard()
      expect(getPushSwitch().hasAttribute('disabled')).toBe(true)
    })

    it('surfaces the error note when a toggle attempt fails', () => {
      pushToggleMutation.data = { ok: false, reason: 'error' }
      renderCard()
      expect(screen.getByText(CARD_COPY.pushError)).toBeTruthy()
    })

    it('surfaces the denied note after a dismissed prompt while keeping the toggle operable', () => {
      pushDeviceState.data = {
        support: 'supported',
        permission: 'default',
        subscribed: false,
      }
      pushToggleMutation.data = { ok: false, reason: 'permission-denied' }
      renderCard()
      expect(screen.getByText(CARD_COPY.pushDenied)).toBeTruthy()
      expect(getPushSwitch().hasAttribute('disabled')).toBe(false)
      fireEvent.click(getPushSwitch())
      expect(pushToggleMutation.mutate).toHaveBeenCalledWith(true)
    })
  })

  it('keeps the connection when choosing "Keep it linked"', () => {
    renderCard()
    fireEvent.click(
      screen.getByRole('button', { name: CARD_COPY.disconnectCta }),
    )
    fireEvent.click(screen.getByRole('button', { name: CONFIRM_COPY.keepCta }))
    expect(disconnectMutation.mutate).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('dialog', { name: CONFIRM_COPY.ariaLabel }),
    ).toBeNull()
  })
})
