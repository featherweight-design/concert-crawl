// @vitest-environment jsdom

import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'jade' }),
}))

const mockTrack = vi.fn()
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => mockTrack(...args),
}))

// Stubbed so the cacheHit branch is decided by the test rather than by whether
// jsdom happens to have recorded a timing entry for a src it never fetched.
const mockCacheHit = vi.fn((_url: string) => false)
vi.mock('@/lib/analytics/resource-cache', () => ({
  wasServedFromCache: (url: string) => mockCacheHit(url),
}))

import { ShareSheet } from '../ShareSheet'
import type { PosterEvent } from '@/lib/share/poster-event'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const EVENT_ID = '11111111-2222-4333-8444-555555555555'

const poster: PosterEvent = {
  id: EVENT_ID,
  artist: 'Snakebite Revival',
  venue: 'Bluebird Theater',
  city: 'Denver',
  dateShort: 'FRI, MAR 14',
  showTime: '8:00 PM',
  state: 'going',
  dropLabel: null,
}

const mount = (props: Partial<React.ComponentProps<typeof ShareSheet>> = {}) =>
  render(
    <ShareSheet
      open
      onClose={() => {}}
      event={poster}
      handle={null}
      capabilities={props.capabilities ?? {}}
    />,
  )

const preview = () => screen.getByAltText(/Concert Crawl poster/i)

describe('<ShareSheet /> — share analytics (#72)', () => {
  it('records the destination when the poster is saved', () => {
    mount()

    fireEvent.click(screen.getByText('Save image'))

    expect(mockTrack).toHaveBeenCalledWith('share_destination_selected', {
      eventId: EVENT_ID,
      destination: 'save-image',
    })
  })

  it('records the destination when the link is copied', () => {
    mount()

    fireEvent.click(screen.getByText('Copy link'))

    expect(mockTrack).toHaveBeenCalledWith('share_destination_selected', {
      eventId: EVENT_ID,
      destination: 'copy-link',
    })
  })

  // The system-share button only exists where navigator.share does, so the
  // capability has to be injected for this branch to be reachable at all.
  it('records the destination when the system sheet is used', () => {
    mount({ capabilities: { share: () => Promise.resolve() } })

    fireEvent.click(screen.getByText('Share…'))

    expect(mockTrack).toHaveBeenCalledWith('share_destination_selected', {
      eventId: EVENT_ID,
      destination: 'system',
    })
  })

  it('records the shape and theme the rendered card was drawn in', () => {
    mount()

    fireEvent.load(preview())

    expect(mockTrack).toHaveBeenCalledWith('share_card_rendered', {
      ratio: 'story',
      theme: 'jade',
      cacheHit: false,
    })
  })

  // The whole point of the property: a re-render served from memory cache
  // costs nothing, and counting it as a fresh render would overstate the
  // route's real load.
  it('marks a render served from cache as a hit', () => {
    mockCacheHit.mockReturnValue(true)
    mount()

    fireEvent.load(preview())

    expect(mockTrack).toHaveBeenCalledWith(
      'share_card_rendered',
      expect.objectContaining({ cacheHit: true }),
    )
  })

  it('reports the shape actually selected, not the default', () => {
    mount()

    // "Wide" is the `link` shape's button label — the handoff locks the key,
    // not the word the button says.
    fireEvent.click(screen.getByRole('button', { name: 'Wide' }))
    fireEvent.load(preview())

    expect(mockTrack).toHaveBeenCalledWith(
      'share_card_rendered',
      expect.objectContaining({ ratio: 'link' }),
    )
  })

  // A failed render is not a render. Counting it would make the success rate
  // of the poster route unmeasurable from this event.
  it('does not record a card that failed to render', () => {
    mount()

    fireEvent.error(preview())

    expect(mockTrack).not.toHaveBeenCalledWith(
      'share_card_rendered',
      expect.anything(),
    )
  })
})
