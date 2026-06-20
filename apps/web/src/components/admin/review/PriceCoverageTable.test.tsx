// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriceCoverageTable } from './PriceCoverageTable'

interface PriceEvent {
  eventId: string
  eventTitle: string
  artist: string | null
  venueName: string | null
  date: string
  ticketUrl: string | null
  priceMin: string | null
  priceMax: string | null
  priceSource: string | null
  lastRetrievedAt: string | null
  lastOutcome: string | null
}

const buildEvent = (overrides: Partial<PriceEvent> = {}): PriceEvent => ({
  eventId: 'evt-1',
  eventTitle: 'Sample Show',
  artist: 'Sample Artist',
  venueName: 'Sample Venue',
  date: '2026-07-01',
  ticketUrl: null,
  priceMin: null,
  priceMax: null,
  priceSource: null,
  lastRetrievedAt: null,
  lastOutcome: null,
  ...overrides,
})

const noop = () => {}

describe('PriceCoverageTable header badge (#710)', () => {
  // Regression for #710 — when paginating, the badge was reading the
  // current page's row count (`events.filter(...).length`) instead of the
  // server total. So "Price coverage 20 missing" rendered next to a pager
  // footer reading "1–20 of 963". The fix uses `total` directly.
  it('shows the server total in the missing badge when missingOnly=true', () => {
    const events = Array.from({ length: 20 }).map((_, idx) =>
      buildEvent({ eventId: `evt-${idx}` }),
    )

    render(
      <PriceCoverageTable
        events={events}
        loading={false}
        missingOnly={true}
        page={1}
        pageSize={20}
        total={963}
        onPageChange={noop}
        onPageSizeChange={noop}
        onToggleFilter={noop}
      />,
    )

    expect(screen.getByText('963 missing')).toBeTruthy()
    expect(screen.queryByText('20 missing')).toBeNull()
  })

  // The badge label "missing" only makes semantic sense for the
  // missingOnly=true view. When the user toggles to "show all", `total`
  // includes events with prices — labelling that "X missing" would lie.
  // We hide the badge instead of fabricating a number with a wrong label.
  it('hides the missing badge when missingOnly=false', () => {
    const events = [buildEvent({ priceMin: null })]

    render(
      <PriceCoverageTable
        events={events}
        loading={false}
        missingOnly={false}
        page={1}
        pageSize={20}
        total={1200}
        onPageChange={noop}
        onPageSizeChange={noop}
        onToggleFilter={noop}
      />,
    )

    expect(screen.queryByText(/missing/)).toBeNull()
  })

  it('hides the missing badge while loading', () => {
    render(
      <PriceCoverageTable
        events={[]}
        loading={true}
        missingOnly={true}
        page={1}
        pageSize={20}
        total={963}
        onPageChange={noop}
        onPageSizeChange={noop}
        onToggleFilter={noop}
      />,
    )

    expect(screen.queryByText(/missing/)).toBeNull()
  })

  // Copilot follow-up on #710: when paging clamps invalid deep-links, the
  // parent query briefly returns events=[] while total>0. Showing "All
  // events have prices — nothing missing." next to a "963 missing" badge
  // would contradict the badge. The empty-state copy must only render
  // when the server total really is zero.
  it('does not show the empty-state copy when total > 0 but page is empty', () => {
    render(
      <PriceCoverageTable
        events={[]}
        loading={false}
        missingOnly={true}
        page={9}
        pageSize={20}
        total={963}
        onPageChange={noop}
        onPageSizeChange={noop}
        onToggleFilter={noop}
      />,
    )

    expect(screen.getByText('963 missing')).toBeTruthy()
    // Empty-state copy strings should not render.
    expect(screen.queryByText(/All events have prices/i)).toBeNull()
    expect(screen.queryByText(/No upcoming events/i)).toBeNull()
  })

  it('shows empty-state copy when total === 0 (truly nothing missing)', () => {
    render(
      <PriceCoverageTable
        events={[]}
        loading={false}
        missingOnly={true}
        page={1}
        pageSize={20}
        total={0}
        onPageChange={noop}
        onPageSizeChange={noop}
        onToggleFilter={noop}
      />,
    )

    expect(screen.getByText(/All events have prices/i)).toBeTruthy()
  })
})
