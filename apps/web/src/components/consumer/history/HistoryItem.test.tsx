// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { HistoryShow } from '@concert-crawl/types'
import { HistoryItem } from './HistoryItem'
import { HISTORY_COPY } from './definitions/copy'

afterEach(cleanup)

const SHOW: HistoryShow = {
  eventId: 'evt-1',
  artist: 'Wednesday',
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  neighborhood: 'RiNo',
  date: '2026-05-14',
  dateLabel: 'Thu, May 14',
  showTime: '8:00 PM',
  priceFinal: 22,
  genre: 'indie',
  attendingAt: '2026-05-14T02:00:00.000Z',
}

describe('HistoryItem', () => {
  it('links the row to the event and names the artist', () => {
    render(<HistoryItem show={SHOW} density="cozy" />)

    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/evt-1')
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
  })

  it('joins venue, date, and show time into one meta line', () => {
    render(<HistoryItem show={SHOW} density="cozy" />)

    expect(
      screen.getByText('Larimer Lounge · Thu, May 14 · 8:00 PM'),
    ).toBeInTheDocument()
  })

  it('drops the show time from the meta line when it is null', () => {
    render(<HistoryItem show={{ ...SHOW, showTime: null }} density="cozy" />)

    expect(screen.getByText('Larimer Lounge · Thu, May 14')).toBeInTheDocument()
  })

  it.each(['compact', 'cozy'] as const)(
    'hides the genre/price detail line at %s density',
    (density) => {
      render(<HistoryItem show={SHOW} density={density} />)

      expect(screen.queryByText(/indie/)).not.toBeInTheDocument()
      expect(
        screen.queryByText(new RegExp(HISTORY_COPY.item.paid(22))),
      ).not.toBeInTheDocument()
    },
  )

  it('shows the genre and paid price at roomy density', () => {
    render(<HistoryItem show={SHOW} density="roomy" />)

    expect(
      screen.getByText(`indie · ${HISTORY_COPY.item.paid(22)}`),
    ).toBeInTheDocument()
  })

  it('omits the paid price at roomy density when none was observed', () => {
    render(<HistoryItem show={{ ...SHOW, priceFinal: null }} density="roomy" />)

    expect(screen.getByText('indie')).toBeInTheDocument()
    expect(screen.queryByText(/paid \$/)).not.toBeInTheDocument()
  })

  it('renders no detail line at roomy density when genre and price are both null', () => {
    render(
      <HistoryItem
        show={{ ...SHOW, genre: null, priceFinal: null }}
        density="roomy"
      />,
    )

    expect(screen.queryByText(/paid \$/)).not.toBeInTheDocument()
    expect(screen.getByText('Wednesday')).toBeInTheDocument()
  })

  it('keeps the stub stamp out of the accessibility tree', () => {
    const { container } = render(<HistoryItem show={SHOW} density="cozy" />)

    // Every svg on the row (identity art + stamp) is decoration.
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
