// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { BatchPage, BatchRow } from './batch-data';
import type * as BatchData from './batch-data';
import type * as Primitives from '@/components/admin/primitives';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

const getToken = vi.fn(async () => 'token');
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));
vi.mock('@/components/admin/crawl/CrawlAllDialog', () => ({
  CrawlAllButton: () => null,
}));
// The phone: A3/09/runs-filters-m.
vi.mock('@/components/admin/primitives', async (importOriginal) => ({
  ...(await importOriginal<typeof Primitives>()),
  useIsPhone: () => true,
}));

const fetchBatchPage =
  vi.fn<(getToken: unknown, path: string) => Promise<BatchPage>>();
vi.mock('./batch-data', async (importOriginal) => ({
  ...(await importOriginal<typeof BatchData>()),
  fetchBatchPage: (getTokenFn: unknown, path: string) =>
    fetchBatchPage(getTokenFn, path),
  fetchNextCrawlAt: async () => null,
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

const recrawl: BatchRow = {
  key: 'by_hand:user_1:1762809240',
  kind: 'by_hand',
  startedAt: '2026-11-10T21:14:00.000Z',
  endedAt: '2026-11-10T21:18:00.000Z',
  night: null,
  venueCount: 1,
  counts: COUNTS,
  eventsFound: 106,
  pending: 0,
  didntStart: false,
  costUsd: 0.15,
  linkKey: 'run:1762809240:abcd1234',
  crawlAll: false,
  venueName: 'Ball Arena',
  actorHandle: null,
  retry: null,
};

const didntStart: BatchRow = {
  ...recrawl,
  key: 'nightly:2026-11-08',
  kind: 'nightly',
  startedAt: null,
  endedAt: null,
  night: '2026-11-08',
  venueCount: 0,
  counts: { ...COUNTS, ok: 0, total: 0 },
  costUsd: 0,
  didntStart: true,
  linkKey: 'nightly:2026-11-08',
  venueName: null,
};

beforeEach(() => {
  fetchBatchPage.mockReset();
  fetchBatchPage.mockResolvedValue({
    rows: [recrawl, didntStart],
    hasMore: true,
    nextBefore: '2026-11-01T00:00:00.000Z',
  });
  render(<CrawlRunsClient />);
});
afterEach(cleanup);

describe('CrawlRunsClient on the phone', () => {
  it('draws the cards as a list, not the desktop table', async () => {
    const list = await screen.findByRole('list', { name: 'Crawl runs' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('draws the filter as the segmented control', async () => {
    const group = await screen.findByRole('group', { name: 'Which crawls' });
    expect(group).toHaveStyle({ padding: '3px', borderRadius: '10px' });
    const all = within(group).getByRole('button', { name: 'All' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveStyle({ height: '32px', borderRadius: '7px' });
  });

  it('opens ?run= from a card, and leaves a night that didn’t start unlinked', async () => {
    const [card, night] = await screen.findAllByTestId('crawl-batch-row');
    expect(within(card!).getByRole('link')).toHaveAttribute(
      'href',
      '/admin/crawl?run=run%3A1762809240%3Aabcd1234',
    );
    expect(within(night!).queryByRole('link')).not.toBeInTheDocument();
    expect(night).toHaveTextContent('Didn’t start');
  });

  it('pads Load more 12px 0 with no rule of its own', async () => {
    const footer = await screen.findByTestId('crawl-runs-load-more');
    expect(footer).toHaveStyle({ padding: '12px 0px' });
    expect(footer.style.borderTop).toBe('');
  });
});
