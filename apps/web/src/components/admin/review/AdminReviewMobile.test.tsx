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
})
