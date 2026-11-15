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
vi.mock('@/lib/api', () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
}));
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
  // Desktop, so the page renders the All events tab content.
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(cleanup);

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
