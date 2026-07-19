// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SpotifyConnectionResponse } from '@concert-crawl/types'

let connectionData: SpotifyConnectionResponse | undefined

vi.mock('@/lib/queries/use-spotify-connection', () => ({
  useSpotifyConnection: () => ({ data: connectionData }),
}))

vi.mock('./OAuthHandoffSheet', () => ({
  OAuthHandoffSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="handoff-sheet" /> : null,
}))

beforeEach(() => {
  connectionData = undefined
})

import { SpotifyStatusBanner } from './SpotifyStatusBanner'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.revokeBanner

const BROKEN_BASE = {
  displayName: 'maya.k',
  artistCount: 34,
  lastSyncedAt: new Date().toISOString(),
  autoWatch: false,
  digestEnabled: true,
  pushEnabled: false,
  denverArtistCount: 9,
  denverShowCount: 12,
  matchedArtists: [],
}

describe('SpotifyStatusBanner', () => {
  it('renders nothing while loading, disconnected or healthy', () => {
    const { container, rerender } = render(<SpotifyStatusBanner />)
    expect(container.innerHTML).toBe('')

    connectionData = { status: 'disconnected' }
    rerender(<SpotifyStatusBanner />)
    expect(container.innerHTML).toBe('')

    connectionData = { ...BROKEN_BASE, status: 'connected' }
    rerender(<SpotifyStatusBanner />)
    expect(container.innerHTML).toBe('')
  })

  it('shows the expired-link copy for status error', () => {
    connectionData = { ...BROKEN_BASE, status: 'error' }
    render(<SpotifyStatusBanner />)
    expect(screen.getByText(COPY.token.head)).toBeTruthy()
    expect(screen.getByText(COPY.token.sub)).toBeTruthy()
    expect(screen.getByRole('region', { name: COPY.regionAria })).toBeTruthy()
  })

  it('shows the revoked copy for status revoked', () => {
    connectionData = { ...BROKEN_BASE, status: 'revoked' }
    render(<SpotifyStatusBanner />)
    expect(screen.getByText(COPY.revoke.head)).toBeTruthy()
    expect(screen.getByText(COPY.revoke.sub)).toBeTruthy()
  })

  it('opens the handoff sheet from Reconnect', () => {
    connectionData = { ...BROKEN_BASE, status: 'revoked' }
    render(<SpotifyStatusBanner />)
    expect(screen.queryByTestId('handoff-sheet')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: COPY.cta }))
    expect(screen.getByTestId('handoff-sheet')).toBeTruthy()
  })
})
