// @vitest-environment jsdom

// "Show N shows" with a crew lens drafted next to other filters counts the
// crew's shows that pass them. These pin that nothing is asked without a lens,
// that the rows are counted with the lens filter query, the debounce, that an
// older answer never passes for the current draft's, and the error state.

import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchCrewShows, getToken } = vi.hoisted(() => ({
  fetchCrewShows: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock('@/lib/crews', () => ({ fetchCrewShows }));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, userId: 'user_1' }),
}));

import {
  DRAFT_COUNT_DEBOUNCE_MS,
  type DraftShowCount,
} from './useDraftShowCount';
import { useDraftLensCount } from './useDraftLensCount';

const rows = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ i }));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    QueryClientProvider,
    {
      client: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
    },
    children,
  );

/** Let timers and promise chains (React Query's own scheduling) run. */
const flush = async (ms = 0) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  fetchCrewShows.mockReset();
  getToken.mockReset();
  getToken.mockResolvedValue('token');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDraftLensCount', () => {
  it('asks nothing without a lens', async () => {
    const { result } = renderHook(() => useDraftLensCount(null, ''), {
      wrapper,
    });
    await flush(DRAFT_COUNT_DEBOUNCE_MS * 2);
    expect(result.current).toEqual<DraftShowCount>({ status: 'none' });
    expect(fetchCrewShows).not.toHaveBeenCalled();
  });

  it('counts the crew shows that pass the lens filters', async () => {
    fetchCrewShows.mockResolvedValue(rows(5));
    const { result } = renderHook(
      () => useDraftLensCount('crew-1', 'venueSlug=ogden'),
      { wrapper },
    );
    await flush();
    expect(fetchCrewShows).toHaveBeenCalledWith(
      'token',
      'crew-1',
      'venueSlug=ogden',
    );
    expect(result.current).toEqual<DraftShowCount>({
      status: 'ready',
      count: 5,
    });
  });

  it('keeps the last number pending until the new draft settles', async () => {
    fetchCrewShows
      .mockResolvedValueOnce(rows(5))
      .mockResolvedValueOnce(rows(2));
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useDraftLensCount('crew-1', query),
      { wrapper, initialProps: { query: 'venueSlug=ogden' } },
    );
    await flush();
    expect(result.current).toEqual({ status: 'ready', count: 5 });

    rerender({ query: 'venueSlug=ogden&filterPrice=free' });
    expect(result.current).toEqual({ status: 'pending', count: 5 });

    await flush(DRAFT_COUNT_DEBOUNCE_MS);
    expect(result.current).toEqual({ status: 'ready', count: 2 });
  });

  it('reports an error when the shows cannot be had', async () => {
    fetchCrewShows.mockRejectedValue(new Error('403'));
    const { result } = renderHook(
      () => useDraftLensCount('crew-1', 'venueSlug=ogden'),
      { wrapper },
    );
    await flush();
    expect(result.current).toEqual<DraftShowCount>({ status: 'error' });
  });

  it('is an error, not a guess, with no token', async () => {
    getToken.mockResolvedValue(null);
    const { result } = renderHook(
      () => useDraftLensCount('crew-1', 'venueSlug=ogden'),
      { wrapper },
    );
    await flush();
    expect(result.current).toEqual<DraftShowCount>({ status: 'error' });
    expect(fetchCrewShows).not.toHaveBeenCalled();
  });
});
