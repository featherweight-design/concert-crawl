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
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

// The ⋯ menu's server actions; `VenueMenu.test.tsx` covers what they do.
const mockFeatured = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  activateVenue: vi.fn(),
  hideVenue: vi.fn(),
  pauseCrawling: vi.fn(),
  removeVenue: vi.fn(),
  resumeCrawling: vi.fn(),
  setVenueFeatured: (...args: unknown[]) => mockFeatured(...args),
  tryDeleteVenue: vi.fn(),
}));

// Reads triage over the network; it has its own suite.
vi.mock('@/components/admin/venue-expected-badge/VenueExpectedBadge', () => ({
  VenueExpectedBadge: () => null,
}));

import { VenueHeader } from './VenueHeader';
import { MAX_POLL_MS } from './useRecrawl';
import { POLL_INTERVAL_MS } from '@/components/admin/crawl-trigger-button/definitions/constants';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { ApiError } from '@/lib/api';

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

/** Re-crawl stays one mounted button; its label changes with its state. */
const recrawlButton = () => screen.getByTestId('recrawl-button');
const liveStatus = () => screen.getByRole('status').textContent;

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
    // The venue name is the page's one h1 (orchestrator ruling, 3b part 1).
    expect(
      screen.getByRole('heading', { level: 1, name: 'Ball Arena' }),
    ).toBeTruthy();
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

  it('offers Re-crawl and View on site, which opens our venue page', () => {
    render(<VenueHeader venue={buildVenue()} />);
    expect(recrawlButton().hasAttribute('disabled')).toBe(false);
    expect(recrawlButton().textContent).toBe(COPY.recrawl);
    expect(recrawlButton().hasAttribute('aria-describedby')).toBe(false);
    const link = screen.getByRole('link', { name: COPY.viewOnSite });
    expect(link.getAttribute('href')).toBe('/venues/ball-arena');
  });

  it('keeps an empty live region mounted while idle', () => {
    render(<VenueHeader venue={buildVenue()} />);
    expect(liveStatus()).toBe('');
  });

  it('ends the row with the venue’s ⋯ menu', () => {
    render(<VenueHeader venue={buildVenue()} />);
    expect(
      screen.getByRole('button', { name: COPY.menuLabel('Ball Arena') }),
    ).toBeTruthy();
  });
});

describe('VenueHeader — ⋯ menu failures', () => {
  beforeEach(() => {
    mockFeatured.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a failed change as the toast, and Try again that works clears it', async () => {
    mockFeatured.mockRejectedValueOnce(new Error('boom'));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menuLabel('Ball Arena') }),
    );
    fireEvent.click(screen.getByTestId('venue-menu-flagship'));
    const toast = await screen.findByTestId('save-failed');
    expect(toast.textContent).toContain(FAILED.title(COPY.failed.flagship));
    expect(toast.textContent).toContain(FAILED.body(COPY.failed.flagshipSaved));
    mockFeatured.mockResolvedValueOnce(undefined);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: FAILED.tryAgain }));
    });
    expect(mockFeatured).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('Dismiss closes the toast without trying again', async () => {
    mockFeatured.mockRejectedValueOnce(new Error('boom'));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(
      screen.getByRole('button', { name: COPY.menuLabel('Ball Arena') }),
    );
    fireEvent.click(screen.getByTestId('venue-menu-flagship'));
    await screen.findByTestId('save-failed');
    fireEvent.click(screen.getByRole('button', { name: FAILED.dismiss }));
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(mockFeatured).toHaveBeenCalledTimes(1);
  });

  it('holds Try again while another menu change runs', async () => {
    let finish: () => void = () => undefined;
    mockFeatured.mockRejectedValueOnce(new Error('boom'));
    render(<VenueHeader venue={buildVenue()} />);
    const menu = () =>
      screen.getByRole('button', { name: COPY.menuLabel('Ball Arena') });
    fireEvent.click(menu());
    fireEvent.click(screen.getByTestId('venue-menu-flagship'));
    await screen.findByTestId('save-failed');
    mockFeatured.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    fireEvent.click(menu());
    fireEvent.click(screen.getByTestId('venue-menu-flagship'));
    const tryAgain = screen.getByRole('button', { name: FAILED.tryAgain });
    expect(tryAgain.hasAttribute('disabled')).toBe(true);
    await act(async () => {
      finish();
    });
    expect(screen.queryByTestId('save-failed')).toBeNull();
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

  it('is disabled on an active but unverified venue, with the reason', () => {
    render(<VenueHeader venue={buildVenue({ verified: false })} />);
    expect(recrawlButton().hasAttribute('disabled')).toBe(true);
    expect(screen.getByTestId('venue-header-line').textContent).toBe(
      COPY.recrawlOff.unverified,
    );
    fireEvent.click(recrawlButton());
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('points the disabled button at the line that says why', () => {
    render(<VenueHeader venue={buildVenue({ robotsTxtAllowed: false })} />);
    const describedBy = recrawlButton().getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
      COPY.recrawlOff.robots,
    );
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
    expect(liveStatus()).toBe('');
    expect(recrawlButton().textContent).toBe(COPY.recrawl);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(screen.queryByTestId('recrawl-notice')).toBeNull();
    // Settled: no more polling.
    await tick(POLL_INTERVAL_MS * 3);
    expect(mockFetchTrigger).toHaveBeenCalledTimes(2);
  });

  it('keeps one button mounted, aria-disabled while busy', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(makeTrigger({ status: 'processing' }));
    render(<VenueHeader venue={buildVenue()} />);
    const button = recrawlButton();
    fireEvent.click(button);
    await tick(POLL_INTERVAL_MS);
    expect(recrawlButton()).toBe(button);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.textContent).toBe(COPY.running);
  });

  it('never queues a second crawl while one is pending', async () => {
    let resolvePost: (value: { triggerId: string }) => void = () => undefined;
    mockTrigger.mockReturnValue(
      new Promise((resolve) => {
        resolvePost = resolve;
      }),
    );
    mockFetchTrigger.mockResolvedValue(makeTrigger({ status: 'pending' }));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    fireEvent.click(recrawlButton());
    await tick(0);
    fireEvent.click(recrawlButton());
    expect(mockTrigger).toHaveBeenCalledTimes(1);
    resolvePost({ triggerId: 'trigger-1' });
    await tick(POLL_INTERVAL_MS);
    fireEvent.click(recrawlButton());
    await tick(0);
    expect(mockTrigger).toHaveBeenCalledTimes(1);
  });

  it('says the run failed, refreshes, and offers no Try again', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(
      makeTrigger({ status: 'failed', crawlRunId: 'run-1' }),
    );
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(POLL_INTERVAL_MS);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(screen.getByTestId('recrawl-notice').textContent).toContain(
      COPY.notice.ranFailed,
    );
    expect(liveStatus()).toBe(COPY.notice.ranFailed);
    expect(screen.queryByRole('button', { name: FAILED.tryAgain })).toBeNull();
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: COPY.notice.dismiss }));
    expect(screen.queryByTestId('recrawl-notice')).toBeNull();
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
    expect(liveStatus()).toBe(COPY.queued);
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('shows the API’s reason when it refuses the trigger, and refreshes', async () => {
    mockTrigger.mockRejectedValue(
      new ApiError(409, 'Crawling is paused for this venue'),
    );
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(0);
    expect(screen.getByTestId('save-failed').textContent).toContain(
      FAILED.body('Crawling is paused for this venue.'),
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockFetchTrigger).not.toHaveBeenCalled();
  });

  // Characterization: this already passed before the removed-venue work. The
  // trigger runs in the browser, so the API's message is never redacted and
  // the existing reason path carries it. It pins that a stale page (venue not
  // yet known removed) shows the 409 venue_removed reason in the toast.
  it('characterization: shows the removed-venue refusal on a stale page', async () => {
    const refusal =
      'This venue asked us to remove its data, so it stays off the site.';
    mockTrigger.mockRejectedValue(
      new ApiError(
        409,
        refusal,
        'venue_removed',
        undefined,
        undefined,
        undefined,
        {
          success: false,
          error: refusal,
          code: 'venue_removed',
        },
      ),
    );
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(0);
    expect(screen.getByTestId('save-failed').textContent).toContain(
      FAILED.body(refusal),
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('falls back to the generic line when the refusal has no API reason', async () => {
    mockTrigger.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(0);
    expect(screen.getByTestId('save-failed').textContent).toContain(
      FAILED.body(COPY.failed.recrawlSaved),
    );
  });

  it('drops Try again once the refresh turns Re-crawl off', async () => {
    mockTrigger.mockRejectedValue(
      new ApiError(409, 'Crawling is paused for this venue'),
    );
    const { rerender } = render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(0);
    expect(screen.getByTestId('save-failed')).toBeTruthy();
    rerender(
      <VenueHeader
        venue={buildVenue({ crawlPausedAt: '2026-11-12T00:00:00.000Z' })}
      />,
    );
    expect(screen.queryByTestId('save-failed')).toBeNull();
    // Unpausing later doesn't bring the stale toast back.
    rerender(<VenueHeader venue={buildVenue()} />);
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('retries a failed poll with backoff and keeps polling once it reads', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(makeTrigger({ status: 'processing' }));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(POLL_INTERVAL_MS);
    expect(mockFetchTrigger).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(liveStatus()).toBe(COPY.queued);
    // The retry waits twice as long.
    await tick(POLL_INTERVAL_MS);
    expect(mockFetchTrigger).toHaveBeenCalledTimes(1);
    await tick(POLL_INTERVAL_MS);
    expect(mockFetchTrigger).toHaveBeenCalledTimes(2);
    expect(liveStatus()).toBe(COPY.running);
  });

  it('says the progress is unread, never that it didn’t start, when polling keeps failing', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockRejectedValue(new Error('network down'));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    // 2s, then retries at 4s, 8s and 16s.
    await tick(POLL_INTERVAL_MS * (1 + 2 + 4 + 8));
    expect(mockFetchTrigger).toHaveBeenCalledTimes(4);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(screen.getByTestId('recrawl-notice').textContent).toContain(
      COPY.notice.unknown,
    );
    expect(screen.queryByRole('button', { name: FAILED.tryAgain })).toBeNull();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    await tick(POLL_INTERVAL_MS * 20);
    expect(mockFetchTrigger).toHaveBeenCalledTimes(4);
  });

  it('stops waiting on a trigger that never settles, without re-queuing', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(makeTrigger({ status: 'pending' }));
    render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(MAX_POLL_MS + POLL_INTERVAL_MS);
    expect(screen.getByTestId('recrawl-notice').textContent).toContain(
      COPY.notice.stalled,
    );
    expect(screen.queryByRole('button', { name: FAILED.tryAgain })).toBeNull();
    expect(recrawlButton().textContent).toBe(COPY.recrawl);
    const polls = mockFetchTrigger.mock.calls.length;
    await tick(POLL_INTERVAL_MS * 10);
    expect(mockFetchTrigger.mock.calls.length).toBe(polls);
    expect(mockTrigger).toHaveBeenCalledTimes(1);
  });

  it('stops polling once unmounted mid-poll', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(makeTrigger({ status: 'pending' }));
    const { unmount } = render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(POLL_INTERVAL_MS);
    expect(mockFetchTrigger).toHaveBeenCalledTimes(1);
    unmount();
    await tick(POLL_INTERVAL_MS * 10);
    expect(mockFetchTrigger).toHaveBeenCalledTimes(1);
  });

  it('resets and drops the old poll when the venue changes', async () => {
    mockTrigger.mockResolvedValue({ triggerId: 'trigger-1' });
    mockFetchTrigger.mockResolvedValue(makeTrigger({ status: 'processing' }));
    const { rerender } = render(<VenueHeader venue={buildVenue()} />);
    fireEvent.click(recrawlButton());
    await tick(POLL_INTERVAL_MS);
    expect(liveStatus()).toBe(COPY.running);
    rerender(
      <VenueHeader
        venue={buildVenue({ id: 'venue-2', name: 'Ogden Theatre' })}
      />,
    );
    expect(liveStatus()).toBe('');
    expect(recrawlButton().textContent).toBe(COPY.recrawl);
    await tick(POLL_INTERVAL_MS * 10);
    expect(mockFetchTrigger).toHaveBeenCalledTimes(1);
    // The new venue can start its own crawl.
    fireEvent.click(recrawlButton());
    await tick(0);
    expect(mockTrigger).toHaveBeenLastCalledWith('venue-2', 'test-token');
  });
});
