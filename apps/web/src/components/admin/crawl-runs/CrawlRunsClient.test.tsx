// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { BatchPage, BatchRow } from './batch-data';
import type * as BatchData from './batch-data';

const mockReplace = vi.fn();
let mockSearch = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

const getToken = vi.fn(async () => 'token');
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));
vi.mock('@/components/admin/crawl/CrawlAllDialog', () => ({
  CrawlAllButton: () => null,
}));

const fetchBatchPage =
  vi.fn<(getToken: unknown, path: string) => Promise<BatchPage>>();
const fetchNextCrawlAt = vi.fn(async () => null);
vi.mock('./batch-data', async (importOriginal) => ({
  ...(await importOriginal<typeof BatchData>()),
  fetchBatchPage: (getTokenFn: unknown, path: string) =>
    fetchBatchPage(getTokenFn, path),
  fetchNextCrawlAt: () => fetchNextCrawlAt(),
}));

import { CrawlRunsClient } from './CrawlRunsClient';

const COUNTS = {
  ok: 1,
  notOk: 0,
  unchanged: 0,
  skipped: 0,
  total: 1,
  failed: 0,
  blocked: 0,
};

const batch = (key: string, venueName: string): BatchRow => ({
  key,
  kind: 'by_hand',
  startedAt: '2026-11-10T21:14:00.000Z',
  endedAt: '2026-11-10T21:18:00.000Z',
  night: null,
  venueCount: 1,
  counts: COUNTS,
  eventsFound: 10,
  pending: 0,
  didntStart: false,
  costUsd: 0.1,
  linkKey: `run:${key}`,
  crawlAll: false,
  venueName,
  actorHandle: null,
  retry: null,
});

const page = (
  rows: BatchRow[],
  nextBefore: string | null = null,
): BatchPage => ({
  rows,
  hasMore: nextBefore !== null,
  nextBefore,
});

/** A promise the test settles by hand. */
const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (err: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const rowNames = () =>
  screen
    .queryAllByTestId('crawl-batch-row')
    .map((row) => row.getAttribute('aria-label') ?? '');

beforeEach(() => {
  mockSearch = '';
  mockReplace.mockClear();
  fetchBatchPage.mockReset();
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CrawlRunsClient', () => {
  it('lets only the newest load write', async () => {
    const slowAll = deferred<BatchPage>();
    fetchBatchPage
      .mockReturnValueOnce(slowAll.promise)
      .mockResolvedValueOnce(page([batch('b', 'Bluebird')]));
    const view = render(<CrawlRunsClient />);
    mockSearch = 'kind=by_hand';
    view.rerender(<CrawlRunsClient />);
    await screen.findByText('Re-crawl · Bluebird');
    await act(async () => slowAll.resolve(page([batch('a', 'Ball Arena')])));
    expect(rowNames().join()).toContain('Bluebird');
    expect(rowNames().join()).not.toContain('Ball Arena');
  });

  it('drops a Load more that lands after the filter changed', async () => {
    const more = deferred<BatchPage>();
    fetchBatchPage
      .mockResolvedValueOnce(
        page([batch('a', 'Ball Arena')], '2026-11-01T00:00:00.000Z'),
      )
      .mockReturnValueOnce(more.promise)
      .mockResolvedValueOnce(page([batch('b', 'Bluebird')]));
    const view = render(<CrawlRunsClient />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Load 25 more' }),
    );
    expect(fetchBatchPage.mock.calls[1]?.[1]).toContain(
      'before=2026-11-01T00%3A00%3A00.000Z',
    );
    mockSearch = 'kind=by_hand';
    view.rerender(<CrawlRunsClient />);
    await screen.findByText('Re-crawl · Bluebird');
    await act(async () => more.resolve(page([batch('c', 'Cervantes')])));
    expect(rowNames()).toHaveLength(1);
    expect(rowNames()[0]).toContain('Bluebird');
  });

  it('switches ?kind= from the pills and loads that filter', async () => {
    fetchBatchPage.mockResolvedValue(page([batch('a', 'Ball Arena')]));
    const view = render(<CrawlRunsClient />);
    fireEvent.click(await screen.findByRole('button', { name: 'Nightly' }));
    expect(mockReplace).toHaveBeenCalledWith('/admin/crawl?kind=nightly', {
      scroll: false,
    });
    mockSearch = 'kind=nightly';
    view.rerender(<CrawlRunsClient />);
    await screen.findByRole('button', { name: 'Nightly', pressed: true });
    expect(fetchBatchPage.mock.calls.at(-1)?.[1]).toBe(
      '/v1/admin/crawl/batches?kind=nightly&limit=25',
    );
  });

  it('shows Couldn’t load, then the list after Try again', async () => {
    fetchBatchPage
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce(page([batch('a', 'Ball Arena')]));
    render(<CrawlRunsClient />);
    expect(await screen.findByTestId('couldnt-load')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Re-crawl · Ball Arena');
    expect(screen.queryByTestId('couldnt-load')).not.toBeInTheDocument();
  });

  it('keeps Load more, not the empty line, while older pages remain', async () => {
    fetchBatchPage.mockResolvedValueOnce(page([], '2026-11-01T00:00:00.000Z'));
    mockSearch = 'kind=by_hand';
    render(<CrawlRunsClient />);
    expect(
      await screen.findByRole('button', { name: 'Load 25 more' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('runs-filter-empty')).not.toBeInTheDocument();
  });
});
