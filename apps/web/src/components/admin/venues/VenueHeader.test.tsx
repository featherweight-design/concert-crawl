// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from '@testing-library/react';
import type { CrawlTrigger, VenueWithCrawlHealth } from '@concert-crawl/types';

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

// Reads triage over the network; it has its own suite.
vi.mock('@/components/admin/venue-expected-badge/VenueExpectedBadge', () => ({
  VenueExpectedBadge: () => null,
}));

import { VenueHeader } from './VenueHeader';
import { POLL_INTERVAL_MS } from '@/components/admin/crawl-trigger-button/definitions/constants';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.venueHeader;
const FAILED = ADMIN_COPY.states.saveFailed;

const matchMediaStub = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

const buildVenue = (
  overrides: Partial<VenueWithCrawlHealth> = {},
): VenueWithCrawlHealth => ({
  id: 'venue-1',
  name: 'Ball Arena',
  slug: 'ball-arena',
  websiteUrl: 'https://ballarena.example.com',
  city: 'Denver',
  timezone: 'America/Denver',
  active: true,
  verified: true,
  verifiedBy: null,
  verifiedAt: null,
  lastCrawledAt: null,
  crawlNotes: null,
  crawlDelayMs: 3000,
  crawlWaitUntil: 'networkidle',
  crawlWaitForSelector: null,
  robotsTxtAllowed: true,
  robotsTxtCheckedAt: null,
  consecutiveFailures: 0,
  blockedAt: null,
  crawlPausedAt: null,
  removedAt: null,
  extractionStrategy: null,
  contactEmail: null,
  priceUrl: null,
  ticketVendor: null,
  debugCaptureHtml: false,
  crawlMode: null,
  platform: null,
  platformVenueId: null,
  apiProvider: null,
  apiAccountId: null,
  address: null,
  capacity: null,
  venueType: null,
  about: null,
  neighborhood: 'Central Platte Valley',
  featured: false,
  lat: null,
  lng: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  crawlHealth: {
    sevenDayPercent: 100,
    sparkline: [],
    lastCrawledAt: null,
    avgDurationMs: null,
    eventsTracked: 300,
    consecutiveFails: 0,
  },
  deleteBlockers: { pastShows: 65, upcomingShows: 235, watchers: 12 },
  ...overrides,
});

const makeTrigger = (over: Partial<CrawlTrigger>): CrawlTrigger => ({
  id: 'trigger-1',
  venueId: 'venue-1',
  status: 'pending',
  crawlRunId: null,
  triggeredBy: null,
  createdAt: '2026-11-12T00:00:00.000Z',
  updatedAt: '2026-11-12T00:00:00.000Z',
  ...over,
});

const recrawlButton = () => screen.getByRole('button', { name: COPY.recrawl });

/** Lets a poll tick land and its state updates flush. */
const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  vi.stubGlobal('matchMedia', matchMediaStub);
  mockTrigger.mockReset();
  mockFetchTrigger.mockReset();
  mockRefresh.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('VenueHeader — idle', () => {
  it('draws the name, both chips and the place line', () => {
    render(<VenueHeader venue={buildVenue()} />);
    expect(screen.getByRole('heading', { name: 'Ball Arena' })).toBeTruthy();
    expect(screen.getByTestId('venue-status-on-site').textContent).toBe(
      ADMIN_COPY.venueStatus.onSite.live,
    );
    expect(screen.getByTestId('venue-status-crawling').textContent).toBe(
      ADMIN_COPY.venueStatus.crawling.crawling,
    );
    expect(screen.getByTestId('venue-header-line').textContent).toBe(
      `Central Platte Valley · ${COPY.upcoming(235)}`,
    );
  });

  it('offers Re-crawl and View on site', () => {
    render(<VenueHeader venue={buildVenue()} />);
    expect(recrawlButton().hasAttribute('disabled')).toBe(false);
    const link = screen.getByRole('link', { name: COPY.viewOnSite });
    expect(link.getAttribute('href')).toBe('https://ballarena.example.com');
  });

  it('renders what it is handed after View on site', () => {
    render(
      <VenueHeader venue={buildVenue()} actions={<button>Flagship</button>} />,
    );
    expect(screen.getByRole('button', { name: 'Flagship' })).toBeTruthy();
  });
});

describe('VenueHeader — Re-crawl off', () => {
  it('is disabled on a paused venue, with the reason', () => {
    render(
      <VenueHeader
        venue={buildVenue({ crawlPausedAt: '2026-10-28T18:00:00.000Z' })}
      />,
    );
    expect(recrawlButton().hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('venue-header-line').textContent).toBe(
      COPY.recrawlOff.paused,
    );
  });

  it('is disabled on an auto-paused venue, with the same reason', () => {
    render(
      <VenueHeader
        venue={buildVenue({
          crawlPausedAt: '2026-10-28T18:00:00.000Z',
          consecutiveFailures: 3,
        })}
      />,
    );
    expect(recrawlButton().hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('venue-header-line').textContent).toBe(
      COPY.recrawlOff.paused,
    );
  });

  it('is disabled when robots.txt disallows us, with the reason', () => {
    render(<VenueHeader venue={buildVenue({ robotsTxtAllowed: false })} />);
    expect(recrawlButton().hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('venue-header-line').textContent).toBe(
      COPY.recrawlOff.robots,
    );
  });

  it('is disabled on a hidden venue, and View on site is gone', () => {
    render(<VenueHeader venue={buildVenue({ active: false })} />);
    expect(recrawlButton().hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('venue-header-line').textContent).toBe(
      COPY.recrawlOff.hidden,
    );
    expect(screen.queryByRole('link', { name: COPY.viewOnSite })).toBeNull();
  });

  it('never starts a crawl from a disabled Re-crawl', () => {
    render(<VenueHeader venue={buildVenue({ robotsTxtAllowed: false })} />);
    fireEvent.click(recrawlButton());
    expect(mockTrigger).not.toHaveBeenCalled();
  });
});

describe('VenueHeader — Re-crawl states', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('reads Queued while the trigger is pending', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(makeTrigger({ status: 'pending' }));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(0);
    expect(screen.getByRole('status').textContent).toBe(COPY.queued);
    expect(mockTrigger).toHaveBeenCalledWith('venue-1', 'test-token');
    await tick(POLL_INTERVAL_MS);
    expect(screen.getByRole('status').textContent).toBe(COPY.queued);
  });

  it('reads Crawling now once the crawler has it', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(makeTrigger({ status: 'processing' }));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(POLL_INTERVAL_MS);
    expect(screen.getByRole('status').textContent).toBe(COPY.running);
    expect(mockFetchTrigger).toHaveBeenCalledWith('trigger-1', 'test-token');
  });

  it('goes back to idle and refreshes once the trigger settles', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger
      .mockResolvedValueOnce(makeTrigger({ status: 'processing' }))
      .mockResolvedValueOnce(
        makeTrigger({ status: 'done', crawlRunId: 'run-1' }),
      );
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(POLL_INTERVAL_MS);
    await tick(POLL_INTERVAL_MS);
    expect(screen.queryByRole('status')).toBeNull();
    expect(recrawlButton()).toBeTruthy();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    // Settled: no more polling.
    await tick(POLL_INTERVAL_MS * 3);
    expect(mockFetchTrigger).toHaveBeenCalledTimes(2);
  });

  it('treats a failed trigger with a run as settled, not a failure', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(
      makeTrigger({ status: 'failed', crawlRunId: 'run-1' }),
    );
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(POLL_INTERVAL_MS);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('says so when the trigger fails without a run, and Try again re-queues', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(makeTrigger({ status: 'failed' }));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(POLL_INTERVAL_MS);
    const toast = screen.getByTestId('save-failed');
    expect(toast.textContent).toContain(
      FAILED.title(COPY.failed.recrawl('Ball Arena')),
    );
    expect(toast.textContent).toContain(FAILED.body(COPY.failed.recrawlSaved));
    expect(recrawlButton()).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: FAILED.tryAgain }));
    await tick(0);
    expect(mockTrigger).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toBe(COPY.queued);
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('says so and refreshes when the API refuses the trigger', async () => {
    mockTrigger.mockRejectedValue(new Error('Crawling is paused'));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(0);
    expect(screen.getByTestId('save-failed')).toBeTruthy();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockFetchTrigger).not.toHaveBeenCalled();
  });

  it('says so when a poll fails', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockRejectedValue(new Error('network down'));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(POLL_INTERVAL_MS);
    expect(screen.getByTestId('save-failed')).toBeTruthy();
  });
});
