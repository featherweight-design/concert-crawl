// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { HistoryResponse, HistoryShow } from '@concert-crawl/types'
import type { EntitlementResult } from '@/lib/queries/use-entitlement'

const entitlement: { current: EntitlementResult } = {
  current: { isLoading: false, active: true, surface: 'visible-active' },
}

vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => entitlement.current,
}))

// The route seeds the query from the server; the hook itself is exercised in
// its own suite, so here it only has to hand back what it was seeded with.
const query: { data: HistoryResponse | undefined } = { data: undefined }
vi.mock('@/lib/queries/use-history', () => ({
  useHistory: () => ({ data: query.data }),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('tok') }),
}))

vi.mock('@/lib/history', () => ({
  downloadHistoryIcs: () => Promise.resolve(),
}))

vi.mock('@/lib/queries/use-plan-state', () => ({
  usePlanState: () => ({ data: undefined }),
}))

vi.mock('@/components/consumer/tier-picker/TierPickerSheet', () => ({
  TierPickerSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="tier-picker" /> : null,
}))

import { HistoryContent } from './HistoryContent'
import { HISTORY_COPY } from './definitions/copy'

const show = (eventId: string, date: string): HistoryShow => ({
  eventId,
  artist: `Artist ${eventId}`,
  venueName: 'Larimer Lounge',
  venueSlug: 'larimer-lounge',
  neighborhood: null,
  date,
  dateLabel: 'Thu, May 14',
  showTime: null,
  priceFinal: 22,
  genre: 'indie',
  attendingAt: `${date}T02:00:00.000Z`,
})

const year = new Date().getFullYear()

const RESPONSE: HistoryResponse = {
  shows: [show('a', `${year}-05-14`), show('bb', `${year}-03-02`)],
  stats: {
    nights: 2,
    venues: 1,
    artists: 2,
    topGenre: 'indie',
    topVenue: 'Larimer Lounge',
    first: `${year}-03-02`,
    last: `${year}-05-14`,
    totalSpent: 44,
  },
}

const EMPTY: HistoryResponse = {
  shows: [],
  stats: {
    nights: 0,
    venues: 0,
    artists: 0,
    topGenre: null,
    topVenue: null,
    first: null,
    last: null,
    totalSpent: null,
  },
}

afterEach(() => {
  cleanup()
  query.data = undefined
  entitlement.current = {
    isLoading: false,
    active: true,
    surface: 'visible-active',
  }
})

describe('HistoryContent', () => {
  it('renders the takeover when the server reported the 403 lock', () => {
    entitlement.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    render(<HistoryContent initialData={null} locked scaRegion={false} />)

    expect(
      screen.getByRole('heading', { name: HISTORY_COPY.locked.headline }),
    ).toBeInTheDocument()
  })

  it('renders the takeover when the client plan lost the entitlement', () => {
    // Stale token that downgraded mid-session: the server said nothing, the
    // hook says no.
    entitlement.current = {
      isLoading: false,
      active: false,
      surface: 'paywall-on-tap',
    }
    render(
      <HistoryContent initialData={EMPTY} locked={false} scaRegion={false} />,
    )

    expect(
      screen.getByRole('heading', { name: HISTORY_COPY.locked.headline }),
    ).toBeInTheDocument()
  })

  it('renders the empty state for an entitled user with no nights', () => {
    render(
      <HistoryContent initialData={EMPTY} locked={false} scaRegion={false} />,
    )

    expect(screen.getByText(HISTORY_COPY.empty.headline)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: HISTORY_COPY.locked.headline }),
    ).not.toBeInTheDocument()
  })

  it('renders the populated list from initialData without a flash of empty', () => {
    // No client fetch has resolved yet — the server payload alone must render
    // the rows rather than the "nothing behind you" state.
    render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    )

    expect(
      screen.queryByText(HISTORY_COPY.empty.headline),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Artist a')).toBeInTheDocument()
    expect(screen.getByText('Artist bb')).toBeInTheDocument()
  })

  it('prefers the refetched payload over the server seed once it lands', () => {
    query.data = { ...RESPONSE, shows: [show('cc', `${year}-05-14`)] }
    render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    )

    expect(screen.getByText('Artist cc')).toBeInTheDocument()
    expect(screen.queryByText('Artist a')).not.toBeInTheDocument()
  })

  it('holds the layout while the plan is still resolving', () => {
    entitlement.current = { isLoading: true, active: false, surface: null }
    render(
      <HistoryContent initialData={null} locked={false} scaRegion={false} />,
    )

    expect(
      screen.queryByText(HISTORY_COPY.empty.headline),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: HISTORY_COPY.locked.headline }),
    ).not.toBeInTheDocument()
    // The sub-tabs stay put so the surface doesn't jump when data arrives.
    expect(
      screen.getByRole('navigation', { name: HISTORY_COPY.tabs.ariaLabel }),
    ).toBeInTheDocument()
  })

  it('groups the rows into reverse-chronological month buckets', () => {
    render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    )

    expect(screen.getByText('May')).toBeInTheDocument()
    expect(screen.getByText('March')).toBeInTheDocument()
  })

  it('stacks the rail below the list on mobile and sticks it at lg', () => {
    // One component, one media query — not a second desktop tree.
    const { container } = render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    )

    const rail = screen.getByTestId('history-rail')
    expect(rail.className).toContain('mt-4')
    expect(rail.className).toContain('lg:sticky')
    expect(rail.className).toContain('lg:mt-0')

    const grid = container.querySelector('.lg\\:grid')
    expect(grid).not.toBeNull()
    expect(grid?.className).toContain('lg:grid-cols-[1fr_320px]')
    // The rail is inside the grid, after the list column.
    expect(grid?.contains(rail)).toBe(true)
  })

  it('mounts the calendar row and the Passport teaser in the rail', () => {
    render(
      <HistoryContent
        initialData={RESPONSE}
        locked={false}
        scaRegion={false}
      />,
    )

    const rail = screen.getByTestId('history-rail')
    expect(rail).toHaveTextContent(HISTORY_COPY.calendar.label)
    expect(rail).toHaveTextContent(HISTORY_COPY.passport.headline)
  })
})
