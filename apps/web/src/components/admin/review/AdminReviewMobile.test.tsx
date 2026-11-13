// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// Stub the submissions tab: it mounts PricesSubmissionsClient,
// which needs a QueryClient and Clerk. The regression under test is that
// mobile reaches the same submissions surface as desktop, not the table body.
vi.mock('./_tabs/SubmissionsTabContent', () => ({
  SubmissionsTabContent: () => (
    <div data-testid="submissions-content">submissions body</div>
  ),
}));

import { AdminReviewMobile } from './AdminReviewMobile';

const baseProps = {
  priceEvents: [],
  pricesMissingOnly: false,
  priceEventsPage: 1,
  priceEventsPageSize: 20,
  priceEventsTotal: 0,
  onTogglePriceFilter: vi.fn(),
  onPriceEventsPageChange: vi.fn(),
  onPriceEventsPageSizeChange: vi.fn(),
};

describe('AdminReviewMobile tab switcher', () => {
  it('offers only the three live tabs', () => {
    render(<AdminReviewMobile {...baseProps} />);
    const select = screen.getByRole('combobox', { name: /Review sections/ });
    expect(within(select).getAllByRole('option')).toHaveLength(3);
    expect(
      within(select).queryByRole('option', { name: /Contests/ }),
    ).toBeNull();
    expect(
      within(select).queryByRole('option', { name: 'Missing' }),
    ).toBeNull();
  });

  it('omits per-page counts from the Prices option label (#1079/#1080)', () => {
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
    );
    const select = screen.getByRole('combobox', { name: /Review sections/ });
    expect(
      within(select).getByRole('option', { name: 'Price coverage' }),
    ).toBeTruthy();
  });
});

describe('AdminReviewMobile "Needs price" badge (#1080)', () => {
  const withPricesTab = (
    overrides: Partial<Parameters<typeof AdminReviewMobile>[0]>,
  ) =>
    render(
      <AdminReviewMobile {...baseProps} initialTab="prices" {...overrides} />,
    );

  it('shows the server-side total when filter is on missing-only', () => {
    withPricesTab({ pricesMissingOnly: true, priceEventsTotal: 1183 });
    // The badge must reflect the server total, not the fetched page size.
    // Anchor to the "Needs price" heading, then look for the count inside
    // its containing header row.
    const heading = screen.getByText('Needs price');
    const row = heading.parentElement?.parentElement;
    expect(row).toBeTruthy();
    expect(within(row!).getByText('1183')).toBeTruthy();
  });

  it('hides the badge when the missing filter is off', () => {
    withPricesTab({ pricesMissingOnly: false, priceEventsTotal: 1183 });
    // Off-filter, the server total counts *all* upcoming events, not just
    // the missing-price subset — so the badge must not display.
    const heading = screen.getByText('Needs price');
    const row = heading.parentElement?.parentElement;
    expect(row).toBeTruthy();
    expect(within(row!).queryByText('1183')).toBeNull();
  });

  it('hides the badge when there are zero missing prices', () => {
    withPricesTab({ pricesMissingOnly: true, priceEventsTotal: 0 });
    const heading = screen.getByText('Needs price');
    const row = heading.parentElement?.parentElement;
    expect(row).toBeTruthy();
    expect(within(row!).queryByText('0')).toBeNull();
  });

  it('hides the badge while the price-events query is re-fetching', () => {
    // React Query keeps the previous filter's data as placeholder during a
    // toggle from all → missing, so `priceEventsTotal` momentarily reflects
    // the old total. The badge must stay hidden until the new request
    // resolves.
    withPricesTab({
      pricesMissingOnly: true,
      priceEventsTotal: 1183,
      priceEventsLoading: true,
    });
    const heading = screen.getByText('Needs price');
    const row = heading.parentElement?.parentElement;
    expect(row).toBeTruthy();
    expect(within(row!).queryByText('1183')).toBeNull();
  });
});

describe('AdminReviewMobile submissions/coverage split', () => {
  it('exposes Submissions as its own selectable tab', () => {
    render(<AdminReviewMobile {...baseProps} />);
    const select = screen.getByRole('combobox', { name: /Review sections/ });
    expect(
      within(select).getByRole('option', { name: /Submissions/ }),
    ).toBeTruthy();
  });

  it('shows the pending-submissions count in the Submissions option label', () => {
    render(<AdminReviewMobile {...baseProps} submissionsCount={7} />);
    const select = screen.getByRole('combobox', { name: /Review sections/ });
    expect(
      within(select).getByRole('option', { name: 'Submissions (7)' }),
    ).toBeTruthy();
  });

  it('renders the submissions body when Submissions is selected', () => {
    render(<AdminReviewMobile {...baseProps} />);
    expect(screen.queryByTestId('submissions-content')).toBeNull();
    fireEvent.change(
      screen.getByRole('combobox', { name: /Review sections/ }),
      {
        target: { value: 'submissions' },
      },
    );
    expect(screen.getByTestId('submissions-content')).toBeTruthy();
  });

  it('mounts directly on Submissions when initialTab is submissions', () => {
    render(<AdminReviewMobile {...baseProps} initialTab="submissions" />);
    expect(screen.getByTestId('submissions-content')).toBeTruthy();
  });

  it('keeps the Prices tab to coverage only — no submissions surface', () => {
    // The whole point of the split: the community-submissions panel used to
    // sit above "Needs price" on this one tab. Mobile must match desktop.
    render(<AdminReviewMobile {...baseProps} initialTab="prices" />);
    expect(screen.getByText('Needs price')).toBeTruthy();
    expect(screen.queryByTestId('submissions-content')).toBeNull();
    expect(screen.queryByText(/Community submissions/i)).toBeNull();
  });
});
