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

let syncMutation: MutationStub
let patchMutation: MutationStub
let disconnectMutation: MutationStub

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

beforeEach(() => {
  vi.clearAllMocks()
  syncMutation = makeMutation()
  patchMutation = makeMutation()
  disconnectMutation = makeMutation()
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
