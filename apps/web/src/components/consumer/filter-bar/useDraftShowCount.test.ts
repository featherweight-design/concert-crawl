// @vitest-environment jsdom

// "Show N shows" asks GET /v1/events for the draft's total. These pin the
// debounce, the limit=1 read of `total`, the scoped (token) path, the error
// state, and that an older answer never passes for the current draft's.

import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { publicGet, authedGet, getToken, auth } = vi.hoisted(() => ({
  publicGet: vi.fn(),
  authedGet: vi.fn(),
  getToken: vi.fn(),
  auth: { userId: 'user_1' as string | null },
}));

// The real ApiError stays: the lapse fallback recognises it by class.
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  publicApiClient: { get: publicGet },
  apiClient: { get: authedGet },
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken, userId: auth.userId }),
}));

import { ApiError } from '@/lib/api';
import type * as ApiModule from '@/lib/api';
import {
  DRAFT_COUNT_DEBOUNCE_MS,
  useDraftShowCount,
} from './useDraftShowCount';

/** A request the test resolves or rejects by hand, in any order. */
const deferred = () => {
  let resolve: (total: number) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<{ total: number }>((res, rej) => {
    resolve = (total) => res({ total });
    reject = rej;
  });
  return { promise, resolve, reject };
};

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

const pathOf = (call: unknown[] | undefined) =>
  new URLSearchParams(String(call?.[0]).split('?')[1] ?? '');

beforeEach(() => {
  vi.useFakeTimers();
  publicGet.mockReset();
  authedGet.mockReset();
  getToken.mockReset();
  auth.userId = 'user_1';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDraftShowCount', () => {
  it('asks nothing for a null query and says so', () => {
    const { result } = renderHook(() => useDraftShowCount(null), { wrapper });
    expect(result.current).toEqual({ status: 'none' });
    expect(publicGet).not.toHaveBeenCalled();
  });

  it('reads `total` from a limit=1 ask, sent with an abort signal', async () => {
    publicGet.mockResolvedValue({ total: 42 });
    const { result } = renderHook(
      () => useDraftShowCount('filterWhen=tonight&offset=20'),
      { wrapper },
    );
    // Nothing is known until the answer lands.
    expect(result.current).toEqual({ status: 'pending', count: null });
    await flush();
    expect(publicGet).toHaveBeenCalledTimes(1);
    const params = pathOf(publicGet.mock.calls[0]);
    expect(String(publicGet.mock.calls[0]?.[0])).toMatch(/^\/v1\/events\?/);
    expect(params.get('limit')).toBe('1');
    // The page's `filterWhen` goes out as the API's window; offset never does.
    expect(params.get('from')).not.toBeNull();
    expect(params.get('offset')).toBeNull();
    expect(publicGet.mock.calls[0]?.[1]).toHaveProperty('signal');
    expect(result.current).toEqual({ status: 'ready', count: 42 });
  });

  it('a change waits out the debounce, and quick taps ask only once', async () => {
    publicGet.mockResolvedValue({ total: 7 });
    const { rerender } = renderHook(
      ({ query }: { query: string }) => useDraftShowCount(query),
      { wrapper, initialProps: { query: 'filterPrice=under-25' } },
    );
    await flush();
    expect(publicGet).toHaveBeenCalledTimes(1);
    rerender({ query: 'filterPrice=tbd' });
    await flush(100);
    rerender({ query: 'filterPrice=50-plus' });
    await flush(DRAFT_COUNT_DEBOUNCE_MS - 1);
    expect(publicGet).toHaveBeenCalledTimes(1);
    await flush(1);
    await flush();
    expect(publicGet).toHaveBeenCalledTimes(2);
    expect(pathOf(publicGet.mock.calls[1]).get('filterPrice')).toBe('50-plus');
  });

  it('asks with a token when the draft keeps My artists or taste on', async () => {
    getToken.mockResolvedValue('tok_1');
    authedGet.mockResolvedValue({ total: 5 });
    const { result } = renderHook(
      () => useDraftShowCount('filterFollowing=1&filterVibe=indie'),
      { wrapper },
    );
    await flush(DRAFT_COUNT_DEBOUNCE_MS);
    await flush();
    expect(publicGet).not.toHaveBeenCalled();
    expect(authedGet).toHaveBeenCalledTimes(1);
    expect(authedGet.mock.calls[0]?.[1]).toBe('tok_1');
    expect(pathOf(authedGet.mock.calls[0]).get('following')).toBe('1');
    expect(result.current).toEqual({ status: 'ready', count: 5 });
  });

  it.each([
    [403, 'the same token'],
    [401, 'no token'],
  ] as const)(
    'a lapsed scope (%i) counts the unscoped list, as the list falls back, with %s',
    async (status, _retry) => {
      getToken.mockResolvedValue('tok_1');
      authedGet.mockImplementation((path: string) =>
        new URLSearchParams(path.split('?')[1]).get('following') === '1'
          ? Promise.reject(new ApiError(status, 'scope refused'))
          : Promise.resolve({ total: 31 }),
      );
      publicGet.mockResolvedValue({ total: 31 });
      const { result } = renderHook(
        () => useDraftShowCount('filterFollowing=1'),
        { wrapper },
      );
      await flush();
      await flush();
      const retry = status === 401 ? publicGet : authedGet;
      const lastCall = retry.mock.calls.at(-1);
      expect(pathOf(lastCall).get('following')).toBeNull();
      if (status === 403) expect(lastCall?.[1]).toBe('tok_1');
      expect(result.current).toEqual({ status: 'ready', count: 31 });
    },
  );

  it('a non-scope failure on a scoped count stays an error', async () => {
    getToken.mockResolvedValue('tok_1');
    authedGet.mockRejectedValue(new ApiError(500, 'boom'));
    const { result } = renderHook(() => useDraftShowCount('filterTaste=1'), {
      wrapper,
    });
    await flush();
    await flush();
    expect(publicGet).not.toHaveBeenCalled();
    expect(result.current).toEqual({ status: 'error' });
  });

  it('a scoped count with no token is an error, never an unscoped number', async () => {
    getToken.mockResolvedValue(null);
    const { result } = renderHook(() => useDraftShowCount('filterTaste=1'), {
      wrapper,
    });
    await flush(DRAFT_COUNT_DEBOUNCE_MS);
    await flush();
    expect(publicGet).not.toHaveBeenCalled();
    expect(result.current).toEqual({ status: 'error' });
  });

  it('a failed ask reports an error', async () => {
    publicGet.mockRejectedValue(new Error('500'));
    const { result } = renderHook(
      () => useDraftShowCount('filterWhen=tonight'),
      {
        wrapper,
      },
    );
    await flush(DRAFT_COUNT_DEBOUNCE_MS);
    await flush();
    expect(result.current).toEqual({ status: 'error' });
  });

  it('an older answer landing late never passes for the current count', async () => {
    const first = deferred();
    const second = deferred();
    publicGet
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useDraftShowCount(query),
      { wrapper, initialProps: { query: 'filterPrice=under-25' } },
    );
    await flush();
    rerender({ query: 'filterPrice=tbd' });
    await flush(DRAFT_COUNT_DEBOUNCE_MS);
    expect(publicGet).toHaveBeenCalledTimes(2);
    // The first ask was superseded: its signal is aborted.
    const firstSignal = (
      publicGet.mock.calls[0]?.[1] as { signal: AbortSignal }
    ).signal;
    expect(firstSignal.aborted).toBe(true);
    // The newer answer lands first, then the older one.
    second.resolve(3);
    await flush();
    first.resolve(90);
    await flush();
    expect(result.current).toEqual({ status: 'ready', count: 3 });
  });

  it('marks the last number pending while a newer draft settles', async () => {
    publicGet.mockResolvedValueOnce({ total: 12 });
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useDraftShowCount(query),
      { wrapper, initialProps: { query: 'filterPrice=under-25' } },
    );
    await flush(DRAFT_COUNT_DEBOUNCE_MS);
    await flush();
    expect(result.current).toEqual({ status: 'ready', count: 12 });
    publicGet.mockReturnValueOnce(deferred().promise);
    rerender({ query: 'filterPrice=tbd' });
    // Settling: the 12 belongs to the older draft.
    expect(result.current).toEqual({ status: 'pending', count: 12 });
    await flush(DRAFT_COUNT_DEBOUNCE_MS);
    // In flight: still the older number, still pending.
    expect(result.current).toEqual({ status: 'pending', count: 12 });
  });
});
