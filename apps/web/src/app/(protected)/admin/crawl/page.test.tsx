import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isValidElement } from 'react';

// As Next's own: the redirect throws, so nothing after it runs.
const { mockPermanentRedirect } = vi.hoisted(() => ({
  mockPermanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock('next/navigation', () => ({
  permanentRedirect: mockPermanentRedirect,
}));
vi.mock('@/lib/auth', () => ({
  requireAdminUser: async () => undefined,
}));
vi.mock('@/components/admin/crawl-runs/CrawlRunsClient', () => ({
  CrawlRunsClient: () => null,
}));

import AdminCrawlPage from './page';
import { CrawlRunsClient } from '@/components/admin/crawl-runs/CrawlRunsClient';

const VENUE_ID = '0b7c6f3e-8d2a-4c1b-9e5f-1a2b3c4d5e6f';

const open = (params: Record<string, string | string[]>) =>
  AdminCrawlPage({ searchParams: Promise.resolve(params) });

describe('/admin/crawl?venueId= redirect (3b part 4)', () => {
  beforeEach(() => {
    mockPermanentRedirect.mockClear();
  });

  it('sends a venue’s runs link to its Runs tab, for good', async () => {
    await expect(open({ venueId: VENUE_ID })).rejects.toThrow('NEXT_REDIRECT');
    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      `/admin/venues/${VENUE_ID}?tab=runs`,
    );
  });

  it('drops every other param', async () => {
    await expect(
      open({ venueId: VENUE_ID, tab: 'diagnostics', hasAlert: 'true' }),
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      `/admin/venues/${VENUE_ID}?tab=runs`,
    );
  });

  it('draws the batch list without a venueId', async () => {
    const element = await open({});
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
    expect(isValidElement(element) && element.type).toBe(CrawlRunsClient);
  });

  it('draws the batch list for a venueId that isn’t a uuid', async () => {
    const element = await open({ venueId: 'not-a-venue' });
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
    expect(isValidElement(element) && element.type).toBe(CrawlRunsClient);
  });
});
