// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

// Stub the self-contained contests tab body so the test doesn't need a
// QueryClient / next-navigation providers — the regression under test is
// tab reachability on the mobile shell, not the queue internals. Declared
// before the component import so the stub is in place when the module under
// test (which imports ContestsTabContent) is evaluated.
vi.mock('./_tabs/ContestsTabContent', () => ({
  ContestsTabContent: () => (
    <div data-testid="contests-content">contests body</div>
  ),
}))

import { AdminReviewMobile } from './AdminReviewMobile'

const baseProps = {
  events: [],
  submissions: [],
  priceEvents: [],
  onApprove: vi.fn(),
  onReject: vi.fn(),
  onApproveSubmission: vi.fn(),
  onDenySubmission: vi.fn(),
  pricesMissingOnly: false,
  priceEventsPage: 1,
  priceEventsPageSize: 20,
  priceEventsTotal: 0,
  onTogglePriceFilter: vi.fn(),
  onPriceEventsPageChange: vi.fn(),
  onPriceEventsPageSizeChange: vi.fn(),
  missingEvents: [],
  onMarkMissingPostponed: vi.fn(async () => undefined),
  onMarkMissingCancelled: vi.fn(async () => undefined),
  onDismissMissing: vi.fn(async () => undefined),
}

describe('AdminReviewMobile tab switcher', () => {
  it('exposes Contests as a selectable tab (regression: #1028 unreachable on mobile)', () => {
    render(<AdminReviewMobile {...baseProps} />)
    const select = screen.getByRole('combobox', { name: /Review sections/ })
    expect(
      within(select).getByRole('option', { name: /Contests/ }),
    ).toBeTruthy()
  })

  it('shows the contest count in the option label when > 0', () => {
    render(<AdminReviewMobile {...baseProps} contestCount={3} />)
    const select = screen.getByRole('combobox', { name: /Review sections/ })
    expect(
      within(select).getByRole('option', { name: 'Contests (3)' }),
    ).toBeTruthy()
  })

  it('renders the Contests tab body when Contests is selected', () => {
    render(<AdminReviewMobile {...baseProps} />)
    expect(screen.queryByTestId('contests-content')).toBeNull()
    fireEvent.change(
      screen.getByRole('combobox', { name: /Review sections/ }),
      { target: { value: 'contests' } },
    )
    expect(screen.getByTestId('contests-content')).toBeTruthy()
  })

  it('mounts directly on Contests when initialTab is contests', () => {
    render(<AdminReviewMobile {...baseProps} initialTab="contests" />)
    expect(screen.getByTestId('contests-content')).toBeTruthy()
  })

  it('omits per-page counts from Prices and Missing option labels (#1079/#1080)', () => {
    // Even with a paginated slice full of "needs price" rows, the dropdown
    // labels must not surface a count — the pre-fix behaviour rendered
    // "Prices (20)" from the current-page filter while the true count was
    // in the thousands.
    render(
      <AdminReviewMobile
        {...baseProps}
        priceEvents={Array.from({ length: 20 }, (_, idx) => ({
          eventId: `evt-${idx}`,
          eventTitle: `Show ${idx}`,
          artist: null,
          venueName: 'Bluebird',
          date: '2026-08-01',
          ticketUrl: null,
          priceMin: null,
          priceMax: null,
          priceSource: null,
          lastRetrievedAt: null,
          lastOutcome: null,
        }))}
        pricesMissingOnly
        priceEventsTotal={1183}
      />,
    )
    const select = screen.getByRole('combobox', { name: /Review sections/ })
    expect(within(select).getByRole('option', { name: 'Prices' })).toBeTruthy()
    expect(within(select).getByRole('option', { name: 'Missing' })).toBeTruthy()
  })
})

describe('AdminReviewMobile "Needs price" badge (#1080)', () => {
  const withPricesTab = (
    overrides: Partial<Parameters<typeof AdminReviewMobile>[0]>,
  ) =>
    render(
      <AdminReviewMobile {...baseProps} initialTab="prices" {...overrides} />,
    )

  it('shows the server-side total when filter is on missing-only', () => {
    withPricesTab({ pricesMissingOnly: true, priceEventsTotal: 1183 })
    // The badge must reflect the server total, not the fetched page size.
    // Anchor to the "Needs price" heading, then look for the count inside
    // its containing header row.
    const heading = screen.getByText('Needs price')
    const row = heading.parentElement?.parentElement
    expect(row).toBeTruthy()
    expect(within(row!).getByText('1183')).toBeTruthy()
  })

  it('hides the badge when the missing filter is off', () => {
    withPricesTab({ pricesMissingOnly: false, priceEventsTotal: 1183 })
    // Off-filter, the server total counts *all* upcoming events, not just
    // the missing-price subset — so the badge must not display.
    const heading = screen.getByText('Needs price')
    const row = heading.parentElement?.parentElement
    expect(row).toBeTruthy()
    expect(within(row!).queryByText('1183')).toBeNull()
  })

  it('hides the badge when there are zero missing prices', () => {
    withPricesTab({ pricesMissingOnly: true, priceEventsTotal: 0 })
    const heading = screen.getByText('Needs price')
    const row = heading.parentElement?.parentElement
    expect(row).toBeTruthy()
    expect(within(row!).queryByText('0')).toBeNull()
  })

  it('hides the badge while the price-events query is re-fetching', () => {
    // React Query keeps the previous filter's data as placeholder during a
    // toggle from all → missing, so `priceEventsTotal` momentarily reflects
    // the old total. The badge must stay hidden until the new request
    // resolves.
    withPricesTab({
      pricesMissingOnly: true,
      priceEventsTotal: 1183,
      priceEventsLoading: true,
    })
    const heading = screen.getByText('Needs price')
    const row = heading.parentElement?.parentElement
    expect(row).toBeTruthy()
    expect(within(row!).queryByText('1183')).toBeNull()
  })
})
