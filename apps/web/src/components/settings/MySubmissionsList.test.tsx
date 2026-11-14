// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { UserSubmissionItem } from '@concert-crawl/types';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { MySubmissionsList } from './MySubmissionsList';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));
vi.mock('@/components/consumer/venue-glyph', () => ({
  VenueTile: () => null,
}));

const copy = CONSUMER_COPY.settings;

const row: UserSubmissionItem = {
  id: 's1',
  eventId: 'e1',
  artist: 'Gimme Gimme Disco',
  venue: 'Ogden Theatre',
  venueSlug: 'ogden-theatre',
  date: '2026-10-24',
  priceMin: 2200,
  priceMax: null,
  tier: 'GA',
  corroborationCount: 1,
  submittedAt: '2026-10-20T12:00:00.000Z',
  status: 'confirmed',
};

afterEach(cleanup);

// addendum-2 24-submitted-prices/submitted-prices-m, addendum-4 06.
describe('MySubmissionsList filter row', () => {
  it('is one line that scrolls sideways instead of wrapping', () => {
    render(<MySubmissionsList submissions={[row]} />);
    const group = screen.getByRole('group', {
      name: copy.submissionsFilterAria,
    });
    expect(group.className).toContain('overflow-x-auto');
    expect(group.className).not.toContain('flex-wrap');
  });

  it('draws the active chip with the gradient ring, not a solid accent border', () => {
    render(<MySubmissionsList submissions={[row]} />);
    const [first, second] = screen.getAllByRole('button');
    expect(first?.getAttribute('aria-pressed')).toBe('true');
    expect(first?.getAttribute('data-ring')).toBe('gradient');
    expect(second?.getAttribute('data-ring')).toBeNull();

    fireEvent.click(second as HTMLElement);
    expect(second?.getAttribute('data-ring')).toBe('gradient');
    expect(first?.getAttribute('data-ring')).toBeNull();
  });

  // The state card, not a blank list under the header (`bp-s-empty_search_m`).
  it('shows the empty card for a filter with no rows, and Show all returns', () => {
    render(<MySubmissionsList submissions={[row]} />);
    // One confirmed row: Pending is the third chip and has nothing in it.
    fireEvent.click(screen.getAllByRole('button')[2] as HTMLElement);

    expect(
      screen.getByText(
        copy.submissionsFilterEmpty.title(copy.submissionFilters.pending),
      ),
    ).toBeTruthy();
    expect(screen.queryByText(row.artist)).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: copy.submissionsFilterEmpty.action }),
    );
    expect(screen.getByText(row.artist)).toBeTruthy();
    expect(screen.queryByText(copy.submissionsFilterEmpty.body)).toBeNull();
  });

  it('notes the sort order at the end of the row', () => {
    render(<MySubmissionsList submissions={[row]} />);
    expect(screen.getByText(copy.submissionsNewestFirst)).toBeTruthy();
  });
});
