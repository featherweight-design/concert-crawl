// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SpotifyConnectionResponse } from '@concert-crawl/types'

interface QueryStub {
  data: SpotifyConnectionResponse | undefined
  isPending: boolean
}

let connectionQuery: QueryStub
const makeMutation = () => ({ mutate: vi.fn(), isPending: false, error: null })
let mutations: ReturnType<typeof makeMutation>[]

vi.mock('@/lib/queries/use-spotify-connection', () => ({
  spotifyConnectionQueryKeyBase: ['spotify-connection'],
  spotifyConnectionQueryKey: (userId: string | null | undefined) => [
    'spotify-connection',
    userId ?? null,
  ],
  useSpotifyConnection: () => connectionQuery,
  useSpotifySync: () => mutations[0],
  useSpotifyPatch: () => mutations[1],
  useSpotifyDisconnect: () => mutations[2],
}))

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({ user: null }),
  useReverification: (fetcher: (...args: unknown[]) => Promise<unknown>) =>
    fetcher,
}))

beforeEach(() => {
  vi.clearAllMocks()
  // vi.stubEnv persists for the whole file. Without this, the first test to
  // set the connect flag silently sets it for every test after it.
  vi.unstubAllEnvs()
  connectionQuery = { data: undefined, isPending: true }
  mutations = [makeMutation(), makeMutation(), makeMutation()]
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

import { ConnectionsPanel } from './ConnectionsPanel'
import { SPOTIFY_COPY } from '@/components/consumer/spotify/definitions/copy'

const renderPanel = () => {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <ConnectionsPanel />
    </QueryClientProvider>,
  )
}

describe('ConnectionsPanel', () => {
  it('shows a skeleton while the connection query is pending', () => {
    const { container } = renderPanel()
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders the disconnected entry card and opens the honesty-rail handoff', () => {
    vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '1')
    connectionQuery = { data: { status: 'disconnected' }, isPending: false }
    renderPanel()
    expect(screen.getByText(SPOTIFY_COPY.connectEntry.pitch)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: SPOTIFY_COPY.connectEntry.cta }),
    )
    expect(
      screen.getByRole('dialog', {
        name: SPOTIFY_COPY.oauthHandoff.ariaLabel,
      }),
    ).toBeTruthy()
    for (const line of SPOTIFY_COPY.honestyRail) {
      expect(screen.getByText(line.head)).toBeTruthy()
    }
  })

  // The flag closes the door; it never evicts the people already inside.
  it('hides the connect entry card when the flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '0')
    connectionQuery = { data: { status: 'disconnected' }, isPending: false }
    renderPanel()
    expect(screen.queryByText(SPOTIFY_COPY.connectEntry.pitch)).toBeNull()
  })

  // Disconnected plus flag-off is the common case in prod, so an empty body
  // here would be the state most people see, and it reads as a broken panel.
  it('explains itself instead of blanking when a disconnected user meets the flag', () => {
    vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '0')
    connectionQuery = { data: { status: 'disconnected' }, isPending: false }
    renderPanel()
    expect(screen.getByText(SPOTIFY_COPY.connectUnavailable.head)).toBeTruthy()
  })

  it('shows the connect entry card when the flag is on', () => {
    vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '1')
    connectionQuery = { data: { status: 'disconnected' }, isPending: false }
    renderPanel()
    expect(screen.getByText(SPOTIFY_COPY.connectEntry.pitch)).toBeTruthy()
  })

  it('still renders the connected card when the flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '0')
    connectionQuery = {
      data: {
        status: 'connected',
        displayName: 'maya.k',
        artistCount: 34,
        lastSyncedAt: new Date().toISOString(),
        autoWatch: false,
        digestEnabled: true,
        pushEnabled: false,
        denverArtistCount: 9,
        denverShowCount: 12,
        matchedArtists: [],
      },
      isPending: false,
    }
    renderPanel()
    expect(screen.getByText(SPOTIFY_COPY.connectedCard.linkedPill)).toBeTruthy()
  })

  it('does not blank the panel when the query errors and the flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_SPOTIFY_CONNECT_ENABLED', '0')
    connectionQuery = { data: undefined, isPending: false }
    const { container } = renderPanel()
    expect(container.textContent).not.toBe('')
  })

  it('renders the connected card for a connected row', () => {
    connectionQuery = {
      data: {
        status: 'connected',
        displayName: 'maya.k',
        artistCount: 34,
        lastSyncedAt: new Date().toISOString(),
        autoWatch: false,
        digestEnabled: true,
        pushEnabled: false,
        denverArtistCount: 9,
        denverShowCount: 12,
        matchedArtists: [],
      },
      isPending: false,
    }
    renderPanel()
    expect(screen.getByText(SPOTIFY_COPY.connectedCard.linkedPill)).toBeTruthy()
  })

  const brokenRow = (
    status: 'error' | 'revoked',
  ): SpotifyConnectionResponse => ({
    status,
    displayName: 'maya.k',
    artistCount: 34,
    lastSyncedAt: null,
    autoWatch: false,
    digestEnabled: true,
    pushEnabled: false,
    denverArtistCount: 0,
    denverShowCount: 0,
    matchedArtists: [],
  })

  it('renders the token-refresh failure state with a reconnect action', () => {
    connectionQuery = { data: brokenRow('error'), isPending: false }
    renderPanel()
    expect(screen.getByText(SPOTIFY_COPY.failTokenRefresh.title)).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', {
        name: SPOTIFY_COPY.failTokenRefresh.primaryCta,
      }),
    )
    expect(
      screen.getByRole('dialog', {
        name: SPOTIFY_COPY.oauthHandoff.ariaLabel,
      }),
    ).toBeTruthy()
  })

  it('renders the external-revoke state', () => {
    connectionQuery = { data: brokenRow('revoked'), isPending: false }
    renderPanel()
    expect(screen.getByText(SPOTIFY_COPY.failExternalRevoke.title)).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: SPOTIFY_COPY.failExternalRevoke.primaryCta,
      }),
    ).toBeTruthy()
  })

  it('"Not now" collapses the token-refresh state to the compact banner', () => {
    connectionQuery = { data: brokenRow('error'), isPending: false }
    renderPanel()
    fireEvent.click(
      screen.getByRole('button', {
        name: SPOTIFY_COPY.failTokenRefresh.secondaryCta,
      }),
    )
    expect(screen.queryByText(SPOTIFY_COPY.failTokenRefresh.title)).toBeNull()
    expect(screen.getByText(SPOTIFY_COPY.revokeBanner.token.head)).toBeTruthy()
  })

  it('"Leave it unlinked" collapses the revoke state to the compact banner', () => {
    connectionQuery = { data: brokenRow('revoked'), isPending: false }
    renderPanel()
    fireEvent.click(
      screen.getByRole('button', {
        name: SPOTIFY_COPY.failExternalRevoke.secondaryCta,
      }),
    )
    expect(screen.queryByText(SPOTIFY_COPY.failExternalRevoke.title)).toBeNull()
    expect(screen.getByText(SPOTIFY_COPY.revokeBanner.revoke.head)).toBeTruthy()
  })
})
