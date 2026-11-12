// @vitest-environment jsdom

import '@testing-library/jest-dom';
import React from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PastShowRow } from '@concert-crawl/types';
import { recordsStartLabel, recordsStartShort } from '@concert-crawl/types';

const usePastShows = vi.fn();
const refetch = vi.fn();
let followsActive = true;

vi.mock('@/lib/queries/use-past-shows', () => ({
  usePastShows: (opts: unknown) => usePastShows(opts),
}));
vi.mock('@/lib/queries/use-entitlement', () => ({
  useEntitlement: () => ({
    isLoading: false,
    active: followsActive,
    surface: 'visible-active',
  }),
}));
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ userId: 'user_1' }) }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock('@/components/consumer/went-pill/WentPill', () => ({
  WentPill: ({ artist }: { artist: string }) => (
    <button type="button" data-testid="went-pill">{`pill ${artist}`}</button>
  ),
}));
vi.mock('@/components/consumer/image-slot', () => ({
  Panel: () => <span data-testid="panel" />,
}));

import { HISTORY_COPY } from './definitions/copy';
import { AddShowSheet } from './AddShowSheet';

const COPY = HISTORY_COPY.add;

const row = (over: Partial<PastShowRow> = {}): PastShowRow => ({
  eventId: 'ev1',
  artist: 'Culture Wars',
  artistPhotoUrl: null,
  venueName: 'Gothic Theatre',
  venueSlug: 'gothic-theatre',
  date: '2026-11-07',
  dateLabel: 'Sat, Nov 7',
  attendingAt: null,
  ...over,
});

const result = (over: Record<string, unknown> = {}) => ({
  data: {
    pages: [{ rows: [row()], total: 1, nextCursor: null }],
  },
  isPending: false,
  isError: false,
  refetch,
  fetchNextPage: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  ...over,
});

const setup = (
  props: Partial<React.ComponentProps<typeof AddShowSheet>> = {},
) => {
  const onClose = vi.fn();
  render(<AddShowSheet open onClose={onClose} {...props} />);
  return { onClose };
};

describe('AddShowSheet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    followsActive = true;
    refetch.mockReset();
    usePastShows.mockReset();
    usePastShows.mockReturnValue(result());
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('names the records start from the shared label, never a literal', () => {
    setup();
    const note = screen.getByTestId('add-records-note');
    expect(note).toHaveTextContent(recordsStartLabel());
    expect(note).toHaveTextContent(COPY.recordsLead(recordsStartLabel()));
  });

  it('groups rows under a month and year, with a pill each', () => {
    setup();
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByText('Gothic Theatre · Sat, Nov 7')).toBeInTheDocument();
    expect(screen.getAllByTestId('went-pill')).toHaveLength(1);
  });

  it('shows skeleton rows while the first page loads', () => {
    usePastShows.mockReturnValue(result({ data: undefined, isPending: true }));
    setup();
    expect(screen.getByTestId('add-show-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('add-show-item')).toBeNull();
  });

  it('shows an error line with a retry that refetches', () => {
    usePastShows.mockReturnValue(result({ data: undefined, isError: true }));
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent(COPY.loadFailed);
    fireEvent.click(screen.getByRole('button', { name: COPY.retry }));
    expect(refetch).toHaveBeenCalled();
  });

  it('draws the end of the records when there is no next page', () => {
    setup();
    const end = screen.getByTestId('add-show-end');
    expect(end).toHaveTextContent(COPY.endDivider(recordsStartShort()));
    expect(end).toHaveTextContent(COPY.endLine);
  });

  it('shows the empty state with no rows', () => {
    usePastShows.mockReturnValue(
      result({ data: { pages: [{ rows: [], total: 0, nextCursor: null }] } }),
    );
    setup();
    expect(screen.getByTestId('add-show-none')).toHaveTextContent(
      COPY.emptyTitle,
    );
    expect(screen.getByTestId('add-show-none')).toHaveTextContent(
      COPY.emptyBody(recordsStartLabel()),
    );
  });

  describe('searching', () => {
    const search = (text: string) => {
      fireEvent.change(screen.getByRole('searchbox'), {
        target: { value: text },
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
    };

    it('debounces the term into the query and hides the records note', () => {
      setup();
      search('culture wars');
      expect(usePastShows).toHaveBeenLastCalledWith(
        expect.objectContaining({ term: 'culture wars' }),
      );
      expect(screen.queryByTestId('add-records-note')).toBeNull();
      expect(screen.getByTestId('add-show-count')).toHaveTextContent(
        COPY.resultCount(1),
      );
    });

    it('closes a single-artist list with the "That’s every" footer', () => {
      setup();
      search('culture wars');
      expect(screen.getByTestId('add-show-end')).toHaveTextContent(
        COPY.resultsFooter('Culture Wars', recordsStartLabel()),
      );
    });

    it('keeps the end divider when the rows are several artists', () => {
      usePastShows.mockReturnValue(
        result({
          data: {
            pages: [
              {
                rows: [row(), row({ eventId: 'ev2', artist: 'Other Act' })],
                total: 2,
                nextCursor: null,
              },
            ],
          },
        }),
      );
      setup();
      search('a');
      expect(screen.getByTestId('add-show-end')).toHaveTextContent(
        COPY.endDivider(recordsStartShort()),
      );
    });

    it('clears the search from the ×', () => {
      setup();
      search('culture');
      fireEvent.click(screen.getByRole('button', { name: COPY.clearSearch }));
      expect(screen.getByRole('searchbox')).toHaveValue('');
    });
  });

  describe('scopes', () => {
    it('switches the query when a scope is picked', () => {
      setup();
      fireEvent.click(screen.getByRole('radio', { name: COPY.scopeVenues }));
      expect(usePastShows).toHaveBeenLastCalledWith(
        expect.objectContaining({ scope: 'venues' }),
      );
      expect(
        screen.getByRole('radio', { name: COPY.scopeVenues }),
      ).toHaveAttribute('aria-checked', 'true');
    });

    it('offers Artists I follow with the entitlement', () => {
      setup();
      expect(
        screen.getByRole('radio', { name: COPY.scopeFollows }),
      ).toBeInTheDocument();
    });

    it('hides Artists I follow without it', () => {
      followsActive = false;
      setup();
      expect(
        screen.queryByRole('radio', { name: COPY.scopeFollows }),
      ).toBeNull();
    });
  });

  it('closes from Done', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: COPY.done }));
    expect(onClose).toHaveBeenCalled();
  });
});
