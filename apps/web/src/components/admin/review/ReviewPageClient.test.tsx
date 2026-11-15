// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { AllEventsApi } from './_tabs/AllEventsTabContent';
import type { AllEvent } from './all/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/review',
  useSearchParams: () => new URLSearchParams('tab=all-events'),
}));
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('token') }),
}));
const post = vi.fn();
const del = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
    patch: vi.fn(),
    delete: (...args: unknown[]) => del(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));
const { ApiError } = await import('@/lib/api');
vi.mock('@/lib/queries/use-admin-review', () => ({
  useInvalidateReviewQueries: () => ({
    eventFlags: vi.fn(),
    counts: vi.fn(),
  }),
}));
vi.mock('./ReviewTabs', () => ({ ReviewTabs: () => null }));
// The tab's content stands in for itself: the test only needs the actions
// the page hands it.
const captured: { api: AllEventsApi | null } = { api: null };
vi.mock('./_tabs/AllEventsTabContent', () => ({
  AllEventsTabContent: ({ api }: { api: AllEventsApi }) => {
    captured.api = api;
    return null;
  },
}));

import { ReviewPageClient } from './ReviewPageClient';

const EVENT: AllEvent = {
  id: 'evt-1',
  title: 'Six Foot Blonde',
  artist: 'Six Foot Blonde',
  venueId: 'venue-1',
  venueName: 'Larimer Lounge',
  date: '2026-11-21',
  doorsTime: null,
  showTime: null,
  ticketPriceMin: null,
  ticketPriceMax: null,
  confidenceScore: null,
  verified: true,
  status: 'upcoming',
  extractionStrategy: null,
  sourceUrl: null,
  genre: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  isSoldOut: false,
  hiddenFromConsumer: false,
  isConcertReviewNeeded: false,
};

beforeEach(() => {
  captured.api = null;
  post.mockReset();
  post.mockResolvedValue({});
  del.mockReset();
  // Desktop, so the page renders the All events tab content.
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);

describe('ReviewPageClient single Delete', () => {
  it('counts the route’s own 404 as deleted, not "Event not found"', async () => {
    del.mockRejectedValue(new ApiError(404, 'Event not found'));
    render(<ReviewPageClient decisions={0} />);
    const api = captured.api;
    if (api === null) throw new Error('no api captured');
    await expect(api.deleteEvent(EVENT)).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith('/v1/admin/events/evt-1', 'token');
  });

  it('still throws a refusal for the tab to say in words', async () => {
    del.mockRejectedValue(new ApiError(409, 'not_manual'));
    render(<ReviewPageClient decisions={0} />);
    const api = captured.api;
    if (api === null) throw new Error('no api captured');
    await expect(api.deleteEvent(EVENT)).rejects.toThrow('not_manual');
  });
});

describe('ReviewPageClient bulk Delete', () => {
  it('throws on a malformed response, so the tab shows its generic failure', async () => {
    post.mockResolvedValue({ count: 'two' });
    render(<ReviewPageClient decisions={0} />);
    const api = captured.api;
    if (api === null) throw new Error('no api captured');
    await expect(api.bulkDelete(['evt-1'])).rejects.toThrow();
  });

  it('returns the bulk response, read, for the summary', async () => {
    post.mockResolvedValue({
      count: 2,
      deletedIds: ['evt-1', 'evt-2'],
      skipped: [
        {
          id: 'evt-3',
          reason: 'has_dependents',
          counts: {
            watchers: 1,
            concerts: 0,
            submittedPrices: 0,
            redirects: 0,
          },
        },
      ],
      missing: ['evt-4'],
    });
    render(<ReviewPageClient decisions={0} />);
    const api = captured.api;
    if (api === null) throw new Error('no api captured');
    await expect(
      api.bulkDelete(['evt-1', 'evt-2', 'evt-3', 'evt-4']),
    ).resolves.toEqual({
      count: 2,
      skipped: [{ id: 'evt-3', reason: 'has_dependents' }],
      missing: ['evt-4'],
    });
    expect(post).toHaveBeenCalledWith('/v1/admin/events/bulk/delete', 'token', {
      ids: ['evt-1', 'evt-2', 'evt-3', 'evt-4'],
      confirmation: 'DELETE',
    });
  });
});

describe('ReviewPageClient Mark sold out', () => {
  // The mark's `.default('other')` goes in a follow-up (expand/contract):
  // Review must already send its method, or that follow-up breaks it.
  it('sends evidenceMethod other in the POST body', async () => {
    render(<ReviewPageClient decisions={0} />);
    const api = captured.api;
    if (api === null) throw new Error('All events content not rendered');
    await api.markSoldOut(EVENT);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(
      '/v1/admin/events/evt-1/sold-out',
      'token',
      { evidenceMethod: 'other' },
    );
  });
});
