// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PriceDisputesQueue } from './PriceDisputesQueue'
import type { PriceContestRow } from '@/lib/queries/admin-contests'

const mockRow = (
  overrides: Partial<PriceContestRow> = {},
): PriceContestRow => ({
  contestId: 'contest-1',
  eventId: 'event-1',
  eventTitle: 'Electric Callboy',
  venueName: 'Mission Ballroom',
  eventDate: '2027-08-30',
  tier: 'GA',
  sourceCategory: 'standard',
  parent: {
    id: 'parent-1',
    priceMin: '48',
    priceMax: '58',
    vendor: 'AXS',
    submitter: { userId: 'u-1', handle: 'hugh' },
    confirms: { fans: 2, admin: 0 },
    observedAt: '2026-06-20T00:00:00Z',
    lastUpdatedAt: '2026-06-20T00:00:00Z',
    note: 'Standing GA verified on AXS.',
  },
  counter: {
    id: 'counter-1',
    priceMin: '65',
    priceMax: '80',
    vendor: 'AXS',
    submitter: { userId: 'u-2', handle: 'kel' },
    confirms: { fans: 1, admin: 0 },
    observedAt: '2026-06-22T00:00:00Z',
    note: 'Face moved to $65 after openers announced.',
    status: 'pending',
  },
  filedAt: '2026-06-22T00:00:00Z',
  ...overrides,
})

describe('PriceDisputesQueue', () => {
  // Auto-hide rule from spec §7.5 + design property table §1 line 15
  // ("empty (items.length === 0) | render | return null"). The TAB ITSELF
  // stays visible with (0) in the pill (separate ReviewTabs surface), but
  // the queue panel does not render any empty-state message.
  it('returns null when items is empty', () => {
    const { container } = render(<PriceDisputesQueue items={[]} total={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders one row per contest plus the header row', () => {
    render(
      <PriceDisputesQueue
        items={[mockRow({ contestId: 'c1' }), mockRow({ contestId: 'c2' })]}
        total={2}
      />,
    )
    // 1 header row + 2 data rows
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  // Design property table §1 line 21: count.badge.text = `{total} open`.
  // R6-3: badge reads the paginated envelope `total`, not `items.length`,
  // so the count stays accurate once contests exceed one page.
  it('renders the count badge with "{n} open"', () => {
    render(<PriceDisputesQueue items={[mockRow({})]} total={1} />)
    expect(screen.getByText(/1 open/i)).toBeTruthy()
  })

  // R6-3 regression pin — when the API returns one page (e.g. limit=20)
  // but the true open-contest count is 47, the badge must read "47 open"
  // (not "20 open"). Locks in the badge ↔ Contests tab pill agreement.
  it('renders total in the badge when items.length is less than total (paginated)', () => {
    const twentyItems = Array.from({ length: 20 }, (_unused, idx) =>
      mockRow({ contestId: `c-${idx}` }),
    )
    render(<PriceDisputesQueue items={twentyItems} total={47} />)
    expect(screen.getByText(/47 open/i)).toBeTruthy()
    expect(screen.queryByText(/20 open/i)).toBeNull()
  })

  // Design property table §1 line 16: title.text = "Price disputes"
  it('renders the panel title', () => {
    render(<PriceDisputesQueue items={[mockRow({})]} total={1} />)
    expect(screen.getByText('Price disputes')).toBeTruthy()
  })

  // Spec §7.8 — Resolve action navigates to the per-contest panel route.
  // Using a Next.js <Link> means the rendered anchor href is the
  // navigation target — no useRouter mock required.
  it('renders the resolve button as a link to /admin/review/contests/:contestId', () => {
    render(
      <PriceDisputesQueue items={[mockRow({ contestId: 'go-1' })]} total={1} />,
    )
    const link = screen.getByRole('link', { name: /resolve/i })
    expect(link.getAttribute('href')).toBe('/admin/review/contests/go-1')
  })

  // Design property table §2 — event cell renders `{artist}` title +
  // `{venue} · {date}` subtitle.
  it('renders the event title, venue, and date in the event cell', () => {
    render(
      <PriceDisputesQueue
        items={[
          mockRow({
            eventTitle: 'Big Thief',
            venueName: 'Mission Ballroom',
            eventDate: '2027-09-14',
          }),
        ]}
        total={1}
      />,
    )
    expect(screen.getByText('Big Thief')).toBeTruthy()
    // Venue and date appear together in the subtitle cell.
    expect(screen.getByText(/Mission Ballroom.*2027-09-14/)).toBeTruthy()
  })

  // Design property table §2 — original.cell.price.format =
  // `$floor–$ceiling` if ceiling > floor, else `$floor`.
  it('renders the original price as a range when ceiling > floor', () => {
    render(<PriceDisputesQueue items={[mockRow({})]} total={1} />)
    expect(screen.getByText('$48–$58')).toBeTruthy()
  })

  it('renders the original price as a single value when ceiling is null', () => {
    render(
      <PriceDisputesQueue
        items={[
          mockRow({
            parent: {
              ...mockRow().parent,
              priceMin: '42',
              priceMax: null,
            },
          }),
        ]}
        total={1}
      />,
    )
    expect(screen.getByText('$42')).toBeTruthy()
  })

  // Design property table §2 — gold badge shown only when
  // sourceCategory === 'boxoffice'. The badge.text is "box office".
  it('renders the box-office badge when sourceCategory is boxoffice', () => {
    render(
      <PriceDisputesQueue
        items={[mockRow({ sourceCategory: 'boxoffice' })]}
        total={1}
      />,
    )
    expect(screen.getByText(/box office/i)).toBeTruthy()
  })

  it('does not render the box-office badge when sourceCategory is standard', () => {
    render(
      <PriceDisputesQueue
        items={[mockRow({ sourceCategory: 'standard' })]}
        total={1}
      />,
    )
    expect(screen.queryByText(/box office/i)).toBeNull()
  })

  // Design property table §2 — counter cell always renders a "pending"
  // azure badge (the counter row is by definition status='pending').
  it('renders the pending badge on every counter cell', () => {
    render(<PriceDisputesQueue items={[mockRow({})]} total={1} />)
    expect(screen.getByText(/pending/i)).toBeTruthy()
  })

  // Design property table §2 — attribution format
  // `{submitter} · {confirms} confirms`.
  it('renders the parent attribution with the submitter handle and fan-confirm count', () => {
    render(<PriceDisputesQueue items={[mockRow({})]} total={1} />)
    expect(screen.getByText(/hugh · 2 confirms/)).toBeTruthy()
  })

  it('renders the counter attribution with the counter submitter handle and fan-confirm count', () => {
    render(<PriceDisputesQueue items={[mockRow({})]} total={1} />)
    expect(screen.getByText(/kel · 1 confirms/)).toBeTruthy()
  })

  // When a submitter has no public handle the API returns `handle: null`.
  // The row should still render with the fallback "anonymous" label rather
  // than collapsing the attribution line.
  it('renders the anonymous fallback when a submitter handle is null', () => {
    render(
      <PriceDisputesQueue
        items={[
          mockRow({
            parent: {
              ...mockRow().parent,
              submitter: { userId: 'u-x', handle: null },
            },
          }),
        ]}
        total={1}
      />,
    )
    expect(screen.getByText(/anonymous · 2 confirms/)).toBeTruthy()
  })

  // Multi-row rendering — three contests should all show their Resolve
  // links pointing at the correct contestId.
  it('renders one Resolve link per contest in items order', () => {
    render(
      <PriceDisputesQueue
        items={[
          mockRow({ contestId: 'aaa', eventTitle: 'Show A' }),
          mockRow({ contestId: 'bbb', eventTitle: 'Show B' }),
          mockRow({ contestId: 'ccc', eventTitle: 'Show C' }),
        ]}
        total={3}
      />,
    )
    const links = screen.getAllByRole('link', { name: /resolve/i })
    expect(links).toHaveLength(3)
    expect(links[0]?.getAttribute('href')).toBe('/admin/review/contests/aaa')
    expect(links[1]?.getAttribute('href')).toBe('/admin/review/contests/bbb')
    expect(links[2]?.getAttribute('href')).toBe('/admin/review/contests/ccc')
  })

  // #757 — Filed cell renders a relative timestamp via the RelTime
  // primitive. RTL's act runs effects synchronously, so the label is
  // populated on first render.
  it('renders the Filed cell as a relative time', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    render(
      <PriceDisputesQueue
        items={[mockRow({ filedAt: fiveMinutesAgo })]}
        total={1}
      />,
    )
    expect(screen.getByText(/5m ago/)).toBeTruthy()
  })

  // #758 — counter badge is status-honest: non-pending statuses (only
  // reachable via the all-disputes scope) render their own label instead
  // of a lying azure "pending" pill.
  it('renders the counter status badge from counter.status', () => {
    render(
      <PriceDisputesQueue
        items={[
          mockRow({
            counter: { ...mockRow().counter, status: 'archived' },
          }),
        ]}
        total={1}
      />,
    )
    expect(screen.getByText(/archived/i)).toBeTruthy()
    expect(screen.queryByText(/pending/i)).toBeNull()
  })

  // #758 — header ghost buttons render only when their handlers are
  // wired (the Contests tab always wires them; older callers don't).
  it('does not render the header ghost buttons when handlers are absent', () => {
    render(<PriceDisputesQueue items={[mockRow({})]} total={1} />)
    expect(
      screen.queryByRole('button', { name: /sorted by filed date/i }),
    ).toBeNull()
    expect(
      screen.queryByRole('button', { name: /dispute history/i }),
    ).toBeNull()
  })

  it('fires onSortToggle when the sort ghost button is clicked', () => {
    const onSortToggle = vi.fn()
    render(
      <PriceDisputesQueue
        items={[mockRow({})]}
        total={1}
        sortDirection="asc"
        onSortToggle={onSortToggle}
        showAllDisputes={false}
        onShowAllToggle={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /oldest first/i }))
    expect(onSortToggle).toHaveBeenCalledTimes(1)
  })

  it('fires onShowAllToggle and reflects pressed state on the All disputes button', () => {
    const onShowAllToggle = vi.fn()
    render(
      <PriceDisputesQueue
        items={[mockRow({})]}
        total={1}
        sortDirection="asc"
        onSortToggle={() => {}}
        showAllDisputes={true}
        onShowAllToggle={onShowAllToggle}
      />,
    )
    const button = screen.getByRole('button', { name: /dispute history/i })
    expect(button.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(button)
    expect(onShowAllToggle).toHaveBeenCalledTimes(1)
  })

  // #759 — footer slot renders inside the panel (below the table).
  it('renders the footer node when provided', () => {
    render(
      <PriceDisputesQueue
        items={[mockRow({})]}
        total={1}
        footer={<div data-testid="queue-footer">pager</div>}
      />,
    )
    expect(screen.getByTestId('queue-footer')).toBeTruthy()
  })

  // Column headers — design property table §1 line 38.
  it('renders all five column headers (last is the empty actions column)', () => {
    render(<PriceDisputesQueue items={[mockRow({})]} total={1} />)
    expect(screen.getByRole('columnheader', { name: 'Event' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Original' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Counter' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: 'Filed' })).toBeTruthy()
  })
})
