// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { HistoryStats } from '@concert-crawl/types'
import { HistoryHeader, historyTilesFor } from './HistoryHeader'
import { HISTORY_COPY } from './definitions/copy'

afterEach(cleanup)

const COPY = HISTORY_COPY.header

const STATS: HistoryStats = {
  nights: 12,
  venues: 5,
  artists: 11,
  topGenre: 'indie',
  topVenue: 'Larimer Lounge',
  first: '2026-01-18',
  last: '2026-05-14',
  totalSpent: 264,
}

describe('historyTilesFor', () => {
  it('always emits nights, venues, and artists', () => {
    const keys = historyTilesFor({
      nights: 0,
      venues: 0,
      artists: 0,
      topGenre: null,
      topVenue: null,
      first: null,
      last: null,
      totalSpent: null,
    }).map((tile) => tile.key)

    expect(keys).toEqual(['nights', 'venues', 'artists'])
  })

  it('hides — rather than zeroes — the nullable tiles', () => {
    const keys = historyTilesFor({ ...STATS, topVenue: null }).map(
      (tile) => tile.key,
    )

    expect(keys).not.toContain('topVenue')
    expect(keys).toContain('topGenre')
    expect(keys).toContain('spent')
  })

  it('singularizes the count labels at one', () => {
    const tiles = historyTilesFor({
      ...STATS,
      nights: 1,
      venues: 1,
      artists: 1,
    })

    expect(tiles.map((tile) => tile.label)).toEqual(
      expect.arrayContaining([
        COPY.stats.nightsSingular,
        COPY.stats.venuesSingular,
        COPY.stats.artistsSingular,
      ]),
    )
  })
})

describe('HistoryHeader', () => {
  // No tier chip: this header only renders for a plan that already unlocked
  // History, so naming the tier here sells a subscriber their own plan.
  it('renders the range without naming a tier', () => {
    render(<HistoryHeader stats={STATS} />)

    expect(screen.getByText(COPY.range)).toBeInTheDocument()
    // Match the chip's shape ("+ <tier>"), not one tier's name — renaming the
    // tier shouldn't let the chip regress past this test.
    expect(screen.queryByText(/^\+\s*\S/)).toBeNull()
  })

  it('renders every stat tile with its value', () => {
    render(<HistoryHeader stats={STATS} />)

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('indie')).toBeInTheDocument()
    expect(screen.getByText('Larimer Lounge')).toBeInTheDocument()
    expect(screen.getByText('$264')).toBeInTheDocument()
  })

  it('hides the nullable tiles instead of showing a placeholder', () => {
    render(
      <HistoryHeader
        stats={{ ...STATS, topGenre: null, topVenue: null, totalSpent: null }}
      />,
    )

    expect(screen.queryByText(COPY.stats.topGenre)).not.toBeInTheDocument()
    expect(screen.queryByText(COPY.stats.topVenue)).not.toBeInTheDocument()
    expect(screen.queryByText(COPY.stats.spent)).not.toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('renders the since line from the first attended date', () => {
    render(<HistoryHeader stats={STATS} />)

    expect(screen.getByText(COPY.since('January 2026'))).toBeInTheDocument()
  })

  it('omits the since line when there is no first date', () => {
    render(<HistoryHeader stats={{ ...STATS, first: null }} />)

    expect(screen.queryByText(/^since /)).not.toBeInTheDocument()
  })
})
