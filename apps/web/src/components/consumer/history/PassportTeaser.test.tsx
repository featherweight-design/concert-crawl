// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { HistoryShow, HistoryStats } from '@concert-crawl/types'
import { PassportTeaser } from './PassportTeaser'
import { PASSPORT_ROUTE } from './definitions/constants'
import { HISTORY_COPY } from './definitions/copy'

afterEach(cleanup)

const COPY = HISTORY_COPY.passport

const show = (eventId: string, artist: string): HistoryShow => ({
  eventId,
  artist,
  artistPhotoUrl: null,
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  neighborhood: null,
  date: '2026-05-14',
  dateLabel: 'Thu, May 14',
  showTime: null,
  priceFinal: null,
  genre: 'indie',
  attendingAt: '2026-05-14T02:00:00.000Z',
})

const STATS: HistoryStats = {
  nights: 4,
  venues: 2,
  artists: 4,
  topGenre: 'indie',
  topVenue: 'Larimer Lounge',
  first: '2026-01-18',
  last: '2026-05-14',
  totalSpent: 88,
}

const SHOWS = [show('a', 'Wednesday'), show('b', 'Slaughter Beach, Dog')]

describe('PassportTeaser', () => {
  it('renders the stat strip', () => {
    render(<PassportTeaser stats={STATS} shows={SHOWS} />)

    expect(screen.getByText(COPY.headline)).toBeInTheDocument()
    expect(screen.getByText(COPY.summary(4, 2, 'indie'))).toBeInTheDocument()
  })

  it('falls back to an em dash when there is no top genre', () => {
    render(
      <PassportTeaser stats={{ ...STATS, topGenre: null }} shows={SHOWS} />,
    )

    expect(screen.getByText(/· —$/)).toBeInTheDocument()
  })

  it('singularizes a one-night, one-venue strip', () => {
    render(
      <PassportTeaser
        stats={{ ...STATS, nights: 1, venues: 1 }}
        shows={[SHOWS[0]!]}
      />,
    )

    expect(screen.getByText('1 night · 1 venue · indie')).toBeInTheDocument()
  })

  it('links to the Passport page now that #85 has shipped one', () => {
    render(<PassportTeaser stats={STATS} shows={SHOWS} />)

    expect(PASSPORT_ROUTE).toBe('/passport')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/passport')
    expect(screen.getByText(COPY.link)).toBeInTheDocument()
  })

  it('keeps the decorative stamp strip out of the accessibility tree', () => {
    render(<PassportTeaser stats={STATS} shows={SHOWS} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
