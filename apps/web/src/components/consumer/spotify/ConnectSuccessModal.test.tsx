// @vitest-environment jsdom

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SpotifyConnectionView } from '@concert-crawl/types'

beforeEach(() => {
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

import { ConnectSuccessModal } from './ConnectSuccessModal'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.connectSuccess

const CONNECTION: SpotifyConnectionView = {
  status: 'connected',
  displayName: 'maya.k',
  artistCount: 34,
  lastSyncedAt: new Date().toISOString(),
  autoWatch: false,
  digestEnabled: true,
  pushEnabled: false,
  denverArtistCount: 9,
  denverShowCount: 12,
  matchedArtists: [
    'Sleep Token',
    'Amyl and The Sniffers',
    'Wednesday',
    'Geese',
    'Mannequin Pussy',
    'Bright Eyes',
    'Wisp',
  ],
}

describe('ConnectSuccessModal', () => {
  it('renders the counts, stat strip and recognized chips with a +more chip', () => {
    render(
      <ConnectSuccessModal
        open
        connection={CONNECTION}
        onContinue={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(COPY.title)).toBeTruthy()
    // Body bolds: 34 artists / 9 play Denver.
    expect(screen.getByText(`34${COPY.bodyArtistsSuffix}`)).toBeTruthy()
    expect(screen.getByText(COPY.statDenver)).toBeTruthy()
    // First six Denver-matched chips render; the remaining Denver matches
    // fold into "+3 more" (denverArtistCount 9 - 6 shown).
    expect(screen.getByText('Sleep Token')).toBeTruthy()
    expect(screen.getByText('Bright Eyes')).toBeTruthy()
    expect(screen.queryByText('Wisp')).toBeNull()
    expect(screen.getByText(COPY.moreChip(3))).toBeTruthy()
  })

  it('fires onContinue from the CTA', () => {
    const onContinue = vi.fn()
    render(
      <ConnectSuccessModal
        open
        connection={CONNECTION}
        onContinue={onContinue}
        onClose={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: COPY.cta }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('omits the chip strip when no artists matched', () => {
    render(
      <ConnectSuccessModal
        open
        connection={{ ...CONNECTION, matchedArtists: [] }}
        onContinue={vi.fn()}
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByText(COPY.recognizedLabel)).toBeNull()
  })
})
