// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
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

// A server page of concert flags starting at `start`. The component is
// parent-controlled, so a "page" is just the slice the parent hands down —
// tests simulate paging by re-rendering with a different slice.
const buildPage = (start: number, count: number): EventFlag[] =>
  Array.from({ length: count }).map((_, idx) =>
    buildFlag({ id: `flag-${start + idx}`, title: `Show ${start + idx}` }),
  )

const inspectorTitle = (): string =>
  screen.getByRole('heading', { level: 3 }).textContent ?? ''

describe('EventFlagsSection pagination (#694)', () => {
  it('hides the pager when a single server page holds everything', () => {
    render(
      <EventFlagsSection
        events={buildPage(0, 12)}
        page={1}
        pageSize={20}
        total={12}
        onPageChange={noop}
        onPageSizeChange={noop}
        onApprove={noop}
        onReject={noop}
      />,
    )

    // total <= pageSize on page 1 → no footer pager renders.
    expect(screen.queryByRole('button', { name: 'Page 2' })).toBeNull()
  })

  it('renders the pager and delegates page changes to the parent', () => {
    const onPageChange = vi.fn()
    render(
      <EventFlagsSection
        events={buildPage(0, 20)}
        page={1}
        pageSize={20}
        total={25}
        onPageChange={onPageChange}
        onPageSizeChange={noop}
        onApprove={noop}
        onReject={noop}
      />,
    )

    // total > pageSize → the footer pager is mounted with a Page 2 button.
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }))

    // The component does not slice locally — it asks the parent to refetch.
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('clamps the inspector to the new page first row when the parent swaps pages', () => {
    const { rerender } = render(
      <EventFlagsSection
        events={buildPage(0, 20)}
        page={1}
        pageSize={20}
        total={25}
        onPageChange={noop}
        onPageSizeChange={noop}
        onApprove={noop}
        onReject={noop}
      />,
    )

    // Page 1 → inspector on the first row.
    expect(inspectorTitle()).toBe('Show 0')

    // Parent refetches page 2 (rows 20–24) and bumps the page prop.
    rerender(
      <EventFlagsSection
        events={buildPage(20, 5)}
        page={2}
        pageSize={20}
        total={25}
        onPageChange={noop}
        onPageSizeChange={noop}
        onApprove={noop}
        onReject={noop}
      />,
    )

    // The stale active row is no longer on the page, so the inspector re-seeds
    // to the new page's first row.
    expect(inspectorTitle()).toBe('Show 20')
  })

  it('keeps id-keyed checkbox selection when the parent swaps pages', () => {
    const { rerender } = render(
      <EventFlagsSection
        events={buildPage(0, 20)}
        page={1}
        pageSize={20}
        total={25}
        onPageChange={noop}
        onPageSizeChange={noop}
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

    // Parent swaps to page 2 — the selected row lives on the previous page and
    // is no longer rendered, but the id-keyed selection must survive.
    rerender(
      <EventFlagsSection
        events={buildPage(20, 5)}
        page={2}
        pageSize={20}
        total={25}
        onPageChange={noop}
        onPageSizeChange={noop}
        onApprove={noop}
        onReject={noop}
      />,
    )

    expect(screen.getByText('selected')).toBeTruthy()
    expect(screen.getByText('✓ Approve 1')).toBeTruthy()
  })

  it('resets to the first visible row and clears selection on a filter change', () => {
    // Page holds non-concert rows first, then concert rows. Hiding non-concert
    // flags should re-narrow the visible page and land the inspector on the
    // first surviving (concert) row.
    const nonConcert = Array.from({ length: 4 }).map((_, idx) =>
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
        page={1}
        pageSize={20}
        total={9}
        onPageChange={noop}
        onPageSizeChange={noop}
        onApprove={noop}
        onReject={noop}
      />,
    )

    // Select a row so we can prove the filter clears the selection.
    const [, rowCheckbox] = screen.getAllByRole('checkbox')
    if (!rowCheckbox) throw new Error('expected a row checkbox to render')
    fireEvent.click(rowCheckbox)
    expect(screen.getByText('selected')).toBeTruthy()

    // Inspector starts on the first row (a non-concert one).
    expect(inspectorTitle()).toBe('NonConcert 0')

    fireEvent.click(screen.getByRole('button', { name: /hide non-concert/i }))

    // Only the five concert rows remain; inspector lands on the first.
    expect(inspectorTitle()).toBe('Concert 0')
    // Selection is cleared on filter change, so no bulk dock.
    expect(screen.queryByText('selected')).toBeNull()
  })

  it('keeps the inspector on a visible row after approving the last row of a page', () => {
    // 21 flags → page 2 holds a single row. Approving that lone row empties the
    // page; the parent clamps back to page 1, and the inspector must re-seed to
    // a still-visible row rather than blanking. Regression for #915 review.
    const { rerender } = render(
      <EventFlagsSection
        events={buildPage(20, 1)}
        page={2}
        pageSize={20}
        total={21}
        onPageChange={noop}
        onPageSizeChange={noop}
        onApprove={noop}
        onReject={noop}
      />,
    )

    expect(inspectorTitle()).toBe('Show 20')

    // Approve the active (only) row on page 2. Row + inspector both expose an
    // exact "Approve" button; either fires handleApprove.
    const [approveBtn] = screen.getAllByRole('button', { name: 'Approve' })
    if (!approveBtn) throw new Error('expected an approve button to render')
    fireEvent.click(approveBtn)

    // Parent refetches: page 2 is now empty, so it clamps to page 1 (20 rows).
    rerender(
      <EventFlagsSection
        events={buildPage(0, 20)}
        page={1}
        pageSize={20}
        total={20}
        onPageChange={noop}
        onPageSizeChange={noop}
        onApprove={noop}
        onReject={noop}
      />,
    )

    expect(screen.queryByText('Select an event to inspect')).toBeNull()
    expect(inspectorTitle()).toBe('Show 0')
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
        page={1}
        pageSize={20}
        total={6}
        onPageChange={noop}
        onPageSizeChange={noop}
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
