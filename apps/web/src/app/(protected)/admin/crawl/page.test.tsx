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
  auth: async () => ({ getToken: async () => 'token' }),
  requireAdminUser: async () => undefined,
}));
const mockGet = vi.fn(async (path: string): Promise<unknown> =>
  path.startsWith('/v1/admin/costs/daily') ? { days: [], totalUsd: 0 } : [],
);
vi.mock('@/lib/api', () => ({
  apiClient: { get: (path: string) => mockGet(path) },
}));
vi.mock('@/components/admin/crawl/CrawlSplitView', () => ({
  CrawlSplitView: () => null,
  CrawlRunAllButton: () => null,
}));
vi.mock('@/components/admin/crawl/IssuesBanner', () => ({
  IssuesBanner: () => null,
}));

import AdminCrawlPage from './page';

const VENUE_ID = '0b7c6f3e-8d2a-4c1b-9e5f-1a2b3c4d5e6f';

const open = (params: Record<string, string | string[]>) =>
  AdminCrawlPage({ searchParams: Promise.resolve(params) });

describe('/admin/crawl?venueId= redirect (3b part 4)', () => {
  beforeEach(() => {
    mockPermanentRedirect.mockClear();
    mockGet.mockClear();
  });

  it('sends a venue’s runs link to its Runs tab, for good', async () => {
    await expect(open({ venueId: VENUE_ID })).rejects.toThrow('NEXT_REDIRECT');
    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      `/admin/venues/${VENUE_ID}?tab=runs`,
    );
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('drops every other param', async () => {
    await expect(
      open({ venueId: VENUE_ID, tab: 'diagnostics', hasAlert: 'true' }),
    ).rejects.toThrow('NEXT_REDIRECT');
    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      `/admin/venues/${VENUE_ID}?tab=runs`,
    );
  });

  it('leaves the page as it was without a venueId', async () => {
    const element = await open({});
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
    expect(isValidElement(element)).toBe(true);
  });

  it('leaves the page as it was for a venueId that isn’t a uuid', async () => {
    const element = await open({ venueId: 'not-a-venue' });
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
    expect(isValidElement(element)).toBe(true);
  });
});
