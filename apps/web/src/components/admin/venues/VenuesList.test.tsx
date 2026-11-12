// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VenuesList } from './VenuesList';
import type { VenueListRow } from './venue-list-rules';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('@/components/admin/AddVenueModal', () => ({
  AddVenueModal: () => null,
}));

const venue = (name: string, over: Partial<VenueListRow> = {}): VenueListRow =>
  ({
    id: name,
    name,
    slug: name.toLowerCase(),
    active: true,
    crawlPausedAt: null,
    blockedAt: null,
    consecutiveFailures: 0,
    robotsTxtAllowed: true,
    removedAt: null,
    neighborhood: null,
    eventCount: 1,
    lastRunStatus: 'success',
    latestRun: null,
    ...over,
  }) as VenueListRow; // fixture: the list reads only these fields

const twelveOk = Array.from({ length: 12 }, (_, i) =>
  venue(`Venue ${String(i).padStart(2, '0')}`),
);

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(cleanup);

describe('VenuesList', () => {
  it('folds OK venues past ten and expands them in place', () => {
    render(<VenuesList venues={twelveOk} />);
    expect(screen.getAllByTestId('venue-row')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: '2 more, all OK' }));
    expect(screen.getAllByTestId('venue-row')).toHaveLength(12);
  });

  it('shows the filter-empty state when a search matches nothing', () => {
    render(<VenuesList venues={twelveOk} />);
    fireEvent.change(screen.getByLabelText('Search venues'), {
      target: { value: 'nothing like it' },
    });
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it("says Couldn't load and retries", () => {
    render(<VenuesList venues={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalled();
  });
});
