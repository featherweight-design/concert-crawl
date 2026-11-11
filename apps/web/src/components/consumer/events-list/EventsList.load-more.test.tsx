// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { EventsList } from './EventsList';

const fetchNextPage = vi.fn();
let isFetchingNextPage = false;
let hasNextPage = true;

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/queries/use-events', () => ({
  useEvents: () => ({
    data: { pages: [] },
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  }),
}));
vi.mock('@/lib/queries/use-watching', () => ({
  useWatching: () => ({ data: [] }),
}));

const renderList = () =>
  render(
    <EventsList
      initialEvents={[]}
      initialOffset={0}
      total={40}
      limit={20}
      initialWatchedIds={[]}
    />,
  );

describe('EventsList Load more', () => {
  beforeEach(() => {
    fetchNextPage.mockClear();
    isFetchingNextPage = false;
    hasNextPage = true;
  });

  it('fetches the next page from the Load more button', () => {
    renderList();
    fireEvent.click(
      screen.getByRole('button', { name: CONSUMER_COPY.loadMore }),
    );
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('reads "Loading shows" while fetching, with no wave and no skeleton rows', () => {
    isFetchingNextPage = true;
    const { container } = renderList();
    const button = screen.getByRole('button', {
      name: CONSUMER_COPY.loadingShows,
    });
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(fetchNextPage).not.toHaveBeenCalled();
    // Rule 10: the pink wave is reserved for the first load.
    expect(container.querySelector('[data-part="core"]')).toBeNull();
    expect(container.innerHTML).not.toContain('skeletonPulse');
  });

  it('renders no button once every page is loaded', () => {
    hasNextPage = false;
    renderList();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
