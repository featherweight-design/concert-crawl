// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EventFlagsSection } from './EventFlagsSection'

interface EventFlag {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  venueId: string
  venueName: string | null
}

const buildFlag = (overrides: Partial<EventFlag> = {}): EventFlag => ({
  id: 'flag-1',
  title: 'Sample Show',
  artist: 'Sample Artist',
  date: '2026-07-01',
  doorsTime: null,
  showTime: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
  confidenceScore: 0.9,
  extractionStrategy: 'llm',
  sourceUrl: null,
  genre: ['rock'],
  createdAt: '2026-06-01T00:00:00.000Z',
  venueId: 'venue-1',
  venueName: 'Sample Venue',
  ...overrides,
})

const noop = () => {}

// 25 concert flags → two pages at the default page size of 20.
const buildConcertFlags = (count: number): EventFlag[] =>
  Array.from({ length: count }).map((_, idx) =>
    buildFlag({ id: `flag-${idx}`, title: `Show ${idx}` }),
  )

const inspectorTitle = (): string =>
  screen.getByRole('heading', { level: 3 }).textContent ?? ''

describe('EventFlagsSection pagination (#694)', () => {
  it('keeps id-keyed checkbox selection when paging between pages', () => {
    render(
      <EventFlagsSection
        events={buildConcertFlags(25)}
        onApprove={noop}
        onReject={noop}
      />,
    )

    // First checkbox is the panel select-all; the row checkboxes follow.
    const [, rowCheckbox] = screen.getAllByRole('checkbox')
    if (!rowCheckbox) throw new Error('expected a row checkbox to render')
    fireEvent.click(rowCheckbox)

    // The bulk dock proves a selection exists.
    expect(screen.getByText('selected')).toBeTruthy()

    // Page forward — the selected row now lives on the previous page and is
    // no longer rendered, but the selection must survive.
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }))

    expect(screen.getByText('selected')).toBeTruthy()
    expect(screen.getByText('✓ Approve 1')).toBeTruthy()
  })

  it('clamps the inspector to the new page first row on page change', () => {
    render(
      <EventFlagsSection
        events={buildConcertFlags(25)}
        onApprove={noop}
        onReject={noop}
      />,
    )

    // Default: page 1, inspector on the first row.
    expect(inspectorTitle()).toBe('Show 0')

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }))

    // Page 2 starts at index 20 → 'Show 20'.
    expect(inspectorTitle()).toBe('Show 20')
  })

  it('resets to page 1 first row after a filter change', () => {
    // Page 1 is all non-concert, page 2 leads with a concert row. Hiding
    // non-concert flags should re-slice and land the inspector on the first
    // surviving row (a concert one), not keep the stale page-2 active row.
    const nonConcert = Array.from({ length: 20 }).map((_, idx) =>
      buildFlag({
        id: `nc-${idx}`,
        title: `NonConcert ${idx}`,
        genre: ['non-concert'],
      }),
    )
    const concert = Array.from({ length: 5 }).map((_, idx) =>
      buildFlag({ id: `c-${idx}`, title: `Concert ${idx}`, genre: ['rock'] }),
    )
    render(
      <EventFlagsSection
        events={[...nonConcert, ...concert]}
        onApprove={noop}
        onReject={noop}
      />,
    )

    // Move to page 2 so the active row is a stale non-page-1 selection.
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(inspectorTitle()).toBe('Concert 0')

    // Hide non-concert — only the five concert rows remain, single page.
    fireEvent.click(screen.getByRole('button', { name: /hide non-concert/i }))

    expect(inspectorTitle()).toBe('Concert 0')
    // Selection is cleared on filter change, so no bulk dock.
    expect(screen.queryByText('selected')).toBeNull()
  })

  it('shows the inspector empty state when the filtered page has no rows', () => {
    const nonConcert = Array.from({ length: 6 }).map((_, idx) =>
      buildFlag({
        id: `nc-${idx}`,
        title: `NonConcert ${idx}`,
        genre: ['non-concert'],
      }),
    )
    render(
      <EventFlagsSection
        events={nonConcert}
        onApprove={noop}
        onReject={noop}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /hide non-concert/i }))

    // No visible rows remain, so the inspector falls back to its empty copy.
    expect(screen.getByText('Select an event to inspect')).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })
})
