// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import type { CrawlTrigger } from '@concert-crawl/types';

const mockTrigger = vi.fn();
const mockFetchTrigger = vi.fn();
vi.mock('@/components/admin/crawl-trigger-button/lib/crawl', () => ({
  triggerVenueCrawl: (...args: unknown[]) => mockTrigger(...args),
  fetchCrawlTrigger: (...args: unknown[]) => mockFetchTrigger(...args),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('test-token') }),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { useRecrawl } from './useRecrawl';
import { POLL_INTERVAL_MS } from '@/components/admin/crawl-trigger-button/definitions/constants';

const pending: CrawlTrigger = {
  id: 'trigger-1',
  venueId: 'venue-1',
  status: 'pending',
  crawlRunId: null,
  triggeredBy: null,
  createdAt: '2026-11-12T00:00:00.000Z',
  updatedAt: '2026-11-12T00:00:00.000Z',
};

const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  mockTrigger.mockReset();
  mockFetchTrigger.mockReset();
  mockRefresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useRecrawl', () => {
  it('starts nothing while Re-crawl is off', async () => {
    const { result } = renderHook(() => useRecrawl('venue-1', true));
    act(() => result.current.start());
    await tick(0);
    expect(mockTrigger).not.toHaveBeenCalled();
    expect(result.current.state).toBe('idle');
  });

  it('starts one crawl per pending trigger', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(pending);
    const { result } = renderHook(() => useRecrawl('venue-1', false));
    act(() => {
      result.current.start();
      result.current.start();
    });
    await tick(POLL_INTERVAL_MS);
    act(() => result.current.start());
    await tick(0);
    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe('queued');
  });

  it('sends force only when Re-crawl anyway asks for it', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(pending);
    const { result } = renderHook(() => useRecrawl('venue-1', false));
    act(() => result.current.start(true));
    await tick(0);
    expect(mockTrigger).toHaveBeenCalledWith('venue-1', 'test-token', true);
  });

  it('passes force false on a plain Re-crawl', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(pending);
    const { result } = renderHook(() => useRecrawl('venue-1', false));
    act(() => result.current.start());
    await tick(0);
    expect(mockTrigger).toHaveBeenCalledWith('venue-1', 'test-token', false);
  });

  it('Try again repeats a refused forced start as forced', async () => {
    mockTrigger.mockRejectedValueOnce(new Error('nope'));
    const { result } = renderHook(() => useRecrawl('venue-1', false));
    act(() => result.current.start(true));
    await tick(0);
    expect(result.current.state).toBe('refused');
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(pending);
    act(() => result.current.retry());
    await tick(0);
    expect(mockTrigger).toHaveBeenLastCalledWith('venue-1', 'test-token', true);
  });

  it('dismiss never interrupts a crawl in flight', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(pending);
    const { result } = renderHook(() => useRecrawl('venue-1', false));
    act(() => result.current.start());
    await tick(0);
    act(() => result.current.dismiss());
    expect(result.current.state).toBe('queued');
  });

  it('exposes the latest polled trigger’s progress while in flight', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger
      .mockResolvedValueOnce({
        ...pending,
        progress: {
          queuePosition: 1,
          runningAhead: true,
          estimateMs: null,
          waitMs: 120_000,
        },
      })
      .mockResolvedValueOnce({
        ...pending,
        status: 'processing',
        startedAt: '2026-11-12T22:41:00.000Z',
        updatedAt: '2026-11-12T22:44:00.000Z',
        pagesDone: 2,
        pagesTotal: 4,
      })
      .mockResolvedValueOnce({
        ...pending,
        status: 'done',
        crawlRunId: 'run-1',
      });
    const { result } = renderHook(() => useRecrawl('venue-1', false));
    act(() => result.current.start());
    await tick(0);
    // Queued, but no poll has landed yet.
    expect(result.current.progress).toBeNull();
    await tick(POLL_INTERVAL_MS);
    expect(result.current.progress).toEqual({
      startedAt: null,
      pagesDone: null,
      pagesTotal: null,
      runningAhead: true,
      waitMs: 120_000,
    });
    expect(result.current.line?.state).toBe('queued');
    await tick(POLL_INTERVAL_MS);
    expect(result.current.state).toBe('running');
    expect(result.current.progress).toEqual({
      startedAt: '2026-11-12T22:41:00.000Z',
      pagesDone: 2,
      pagesTotal: 4,
      runningAhead: false,
      waitMs: null,
    });
    await tick(POLL_INTERVAL_MS);
    expect(result.current.state).toBe('idle');
    expect(result.current.progress).toBeNull();
    expect(result.current.line).toBeNull();
  });

  it('resets to idle and cancels the poll timer when the venue changes', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(pending);
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useRecrawl(id, false),
      { initialProps: { id: 'venue-1' } },
    );
    act(() => result.current.start());
    await tick(0);
    expect(result.current.state).toBe('queued');
    rerender({ id: 'venue-2' });
    expect(result.current.state).toBe('idle');
    await tick(POLL_INTERVAL_MS * 5);
    expect(mockFetchTrigger).not.toHaveBeenCalled();
  });
});
