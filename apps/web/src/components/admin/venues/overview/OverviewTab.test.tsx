// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import type {
  VenueLatestRun,
  VenueWithCrawlHealth,
} from '@concert-crawl/types';

const mockDelete = vi.fn();
const { MockApiError } = vi.hoisted(() => ({
  MockApiError: class MockApiError extends Error {
    constructor(public status: number) {
      super(`HTTP ${status}`);
    }
  },
}));
vi.mock('@/lib/api', () => ({
  ApiError: MockApiError,
  apiClient: {
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('test-token') }),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));

// The mock drops data-testid, so links are found by role and name.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { OverviewTab } from './OverviewTab';
import type { OverviewData } from './overview-data';
import type { Recrawl } from '../useRecrawl';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { EVENTS_BY_VENUE_READY } from './overview-rules';

const COPY = ADMIN_COPY.venueOverview;
const RUN = ADMIN_COPY.venuesList.latestRun;

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

const unchangedRun: VenueLatestRun = {
  id: 'run-9',
  status: 'skipped',
  reason: 'page_unchanged',
  at: '2026-11-11T10:02:00.000Z',
  eventsFound: 0,
  eventsInserted: 0,
  errorMessage: null,
};

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
  neighborhood: null,
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
    eventsTracked: 0,
    consecutiveFails: 0,
  },
  upcomingShows: 235,
  hiddenUpcomingShows: 4,
  lastFullRun: { at: '2026-11-10T10:00:00.000Z', eventsFound: 106 },
  latestRun: unchangedRun,
  ...overrides,
});

const DATA: OverviewData = { runs: [], needsYou: [], snoozes: [] };

const mockStart = vi.fn();
const recrawl = (state: Recrawl['state'] = 'idle'): Recrawl => ({
  state,
  reason: null,
  start: mockStart,
  retry: vi.fn(),
  dismiss: vi.fn(),
});

const card = (title: string) => screen.getByRole('region', { name: title });

beforeEach(() => {
  vi.stubGlobal('matchMedia', matchMediaStub);
  mockDelete.mockReset();
  mockRefresh.mockReset();
  mockStart.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('OverviewTab — Latest run', () => {
  it('reads an unchanged run with its sentence and both buttons', () => {
    render(
      <OverviewTab venue={buildVenue()} data={DATA} recrawl={recrawl()} />,
    );
    const latest = within(card(COPY.latestRun.title));
    expect(latest.getByText(RUN.unchanged)).toBeTruthy();
    expect(latest.getByText('Nov 11 · 3:02 AM')).toBeTruthy();
    expect(
      latest.getByText(
        'The calendar page hasn’t changed since Nov 10’s full run, so we kept its 106 shows and didn’t re-read it. Nothing to do.',
      ),
    ).toBeTruthy();
    expect(
      latest
        .getByRole('link', { name: COPY.latestRun.openRun })
        .getAttribute('href'),
    ).toBe('/admin/venues/venue-1?tab=runs&run=run-9');
    fireEvent.click(
      latest.getByRole('button', { name: COPY.latestRun.recrawlAnyway }),
    );
    expect(mockStart).toHaveBeenCalledWith(true);
  });

  it('offers Re-crawl anyway only on an unchanged run', () => {
    render(
      <OverviewTab
        venue={buildVenue({
          latestRun: {
            ...unchangedRun,
            status: 'failed',
            reason: 'timeout',
          },
        })}
        data={DATA}
        recrawl={recrawl()}
      />,
    );
    const latest = within(card(COPY.latestRun.title));
    expect(latest.getByText(RUN.failed)).toBeTruthy();
    expect(latest.getByText('Failed: timed out.')).toBeTruthy();
    expect(
      latest.queryByRole('button', { name: COPY.latestRun.recrawlAnyway }),
    ).toBeNull();
  });

  it('disables Re-crawl anyway where Re-crawl is off, or while busy', () => {
    const { unmount } = render(
      <OverviewTab
        venue={buildVenue({ crawlPausedAt: '2026-11-10T18:00:00.000Z' })}
        data={DATA}
        recrawl={recrawl()}
      />,
    );
    const paused = screen.getByRole('button', {
      name: COPY.latestRun.recrawlAnyway,
    });
    expect(paused.hasAttribute('disabled')).toBe(true);
    expect(paused.getAttribute('aria-describedby')).toBe(
      'venue-header-line-venue-1',
    );
    unmount();
    for (const state of ['queued', 'running'] as const) {
      const busy = render(
        <OverviewTab
          venue={buildVenue()}
          data={DATA}
          recrawl={recrawl(state)}
        />,
      );
      // As the header's Re-crawl: busy stays focusable, aria-disabled only.
      const button = screen.getByRole('button', {
        name: COPY.latestRun.recrawlAnyway,
      });
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.hasAttribute('disabled')).toBe(false);
      busy.unmount();
    }
  });

  it('reads No runs yet when the venue has never crawled', () => {
    render(
      <OverviewTab
        venue={buildVenue({ latestRun: null })}
        data={DATA}
        recrawl={recrawl()}
      />,
    );
    const latest = within(card(COPY.latestRun.title));
    expect(latest.getByText(RUN.never)).toBeTruthy();
    expect(latest.queryByRole('link')).toBeNull();
  });
});

describe('OverviewTab — Last 14 runs', () => {
  const runs: NonNullable<OverviewData['runs']> = [
    {
      id: 'c',
      status: 'skipped',
      reason: 'page_unchanged',
      createdAt: '2026-11-11T10:02:00.000Z',
    },
    {
      id: 'b',
      status: 'failed',
      reason: 'timeout',
      createdAt: '2026-11-10T10:02:00.000Z',
    },
    {
      id: 'a',
      status: 'success',
      reason: null,
      createdAt: '2026-11-09T10:02:00.000Z',
    },
  ];

  it('draws one bar per run, oldest first, each labelled', () => {
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{ ...DATA, runs }}
        recrawl={recrawl()}
      />,
    );
    const bars = within(card(COPY.lastRuns.title)).getAllByRole('img');
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual([
      'Nov 9: Shows found',
      'Nov 10: Failed',
      'Nov 11: Skipped, unchanged',
    ]);
  });

  it('lists only the kinds drawn in the legend', () => {
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{ ...DATA, runs }}
        recrawl={recrawl()}
      />,
    );
    const legend = within(screen.getByTestId('overview-runs-legend'));
    expect(
      legend.getAllByRole('listitem').map((item) => item.textContent),
    ).toEqual([
      COPY.lastRuns.kinds.found,
      COPY.lastRuns.kinds.unchanged,
      COPY.lastRuns.kinds.failed,
    ]);
  });

  it('links All runs to the Runs tab', () => {
    render(
      <OverviewTab venue={buildVenue()} data={DATA} recrawl={recrawl()} />,
    );
    expect(
      within(card(COPY.lastRuns.title))
        .getByRole('link', { name: COPY.lastRuns.allRuns })
        .getAttribute('href'),
    ).toBe('/admin/venues/venue-1?tab=runs');
  });

  it('draws no bars and no legend with no runs', () => {
    render(
      <OverviewTab venue={buildVenue()} data={DATA} recrawl={recrawl()} />,
    );
    expect(within(card(COPY.lastRuns.title)).queryAllByRole('img')).toEqual([]);
    expect(screen.queryByTestId('overview-runs-legend')).toBeNull();
  });

  it('shows Couldn’t load in this card only when the runs fetch failed', () => {
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{ ...DATA, runs: null }}
        recrawl={recrawl()}
      />,
    );
    expect(
      within(card(COPY.lastRuns.title)).getByTestId('couldnt-load'),
    ).toBeTruthy();
    expect(screen.getAllByTestId('couldnt-load')).toHaveLength(1);
    // Latest run still reads the venue.
    expect(
      within(card(COPY.latestRun.title)).getByText(RUN.unchanged),
    ).toBeTruthy();
  });
});

describe('OverviewTab — Shows', () => {
  it('reads upcoming, the last full run and hidden shows', () => {
    render(
      <OverviewTab venue={buildVenue()} data={DATA} recrawl={recrawl()} />,
    );
    const shows = within(card(COPY.shows.title));
    expect(
      shows.getByText(COPY.shows.upcoming).parentElement?.textContent,
    ).toContain('235');
    expect(
      shows.getByText(COPY.shows.lastFullRun).parentElement?.textContent,
    ).toContain('106 (Nov 10)');
    expect(
      shows.getByText(COPY.shows.hidden).parentElement?.textContent,
    ).toContain('4');
  });

  it('offers no Open in Events until Events reads ?venue=', () => {
    render(
      <OverviewTab venue={buildVenue()} data={DATA} recrawl={recrawl()} />,
    );
    expect(EVENTS_BY_VENUE_READY).toBe(false);
    const shows = within(card(COPY.shows.title));
    expect(
      shows.queryByRole('link', { name: COPY.shows.openInEvents }),
    ).toBeNull();
    expect(shows.queryByText(COPY.shows.openInEvents)).toBeNull();
  });

  it('reads None yet without a full run', () => {
    render(
      <OverviewTab
        venue={buildVenue({ lastFullRun: null })}
        data={DATA}
        recrawl={recrawl()}
      />,
    );
    expect(
      within(card(COPY.shows.title)).getByText(COPY.shows.noneYet),
    ).toBeTruthy();
  });
});

describe('OverviewTab — In Needs you', () => {
  const snooze = {
    id: 'snooze-1',
    kind: 'show-dropped' as const,
    reason: 'It’s normal for this venue',
    createdAt: '2026-11-03T18:00:00.000Z',
    createdByName: 'hugh',
  };

  it('says nothing is waiting, with no turned-off section', () => {
    render(
      <OverviewTab venue={buildVenue()} data={DATA} recrawl={recrawl()} />,
    );
    const needs = within(card(COPY.needsYou.title));
    expect(needs.getByText(COPY.needsYou.empty('Ball Arena'))).toBeTruthy();
    expect(needs.queryByText(COPY.needsYou.turnedOff)).toBeNull();
  });

  it('lists the venue’s items with their kind labels, linking to each item', () => {
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{
          ...DATA,
          needsYou: [
            {
              key: 'show-dropped:1',
              kind: 'show-dropped',
              title: 'Khruangbin',
            },
            {
              key: 'venue-failing:v',
              kind: 'venue-failing',
              title: 'Ball Arena',
            },
          ],
        }}
        recrawl={recrawl()}
      />,
    );
    const needs = within(card(COPY.needsYou.title));
    const links = needs.getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/admin/needs-you?item=show-dropped%3A1',
      '/admin/needs-you?item=venue-failing%3Av',
    ]);
    expect(links[0]?.textContent).toBe(`${ADMIN_COPY.kind.show}Khruangbin`);
    expect(links[1]?.textContent).toBe(`${ADMIN_COPY.kind.venue}Ball Arena`);
    expect(needs.queryByText(COPY.needsYou.empty('Ball Arena'))).toBeNull();
  });

  it('lists warnings turned off, and Turn back on deletes then refreshes', async () => {
    mockDelete.mockResolvedValue({ id: 'snooze-1' });
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{ ...DATA, snoozes: [snooze] }}
        recrawl={recrawl()}
      />,
    );
    const needs = within(card(COPY.needsYou.title));
    expect(needs.getByText(COPY.needsYou.turnedOff)).toBeTruthy();
    expect(needs.getByText(COPY.needsYou.kinds['show-dropped'])).toBeTruthy();
    expect(
      needs.getByText(
        'Off since Nov 3, by @hugh · “It’s normal for this venue”',
      ),
    ).toBeTruthy();
    fireEvent.click(
      needs.getByRole('button', {
        name: COPY.needsYou.turnBackOnLabel(
          COPY.needsYou.kinds['show-dropped'],
        ),
      }),
    );
    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith(
        '/v1/admin/needs-you/snoozes/snooze-1',
        'test-token',
      ),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it('a failed Turn back on says so and offers Try again', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockDelete.mockRejectedValueOnce(new Error('boom'));
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{ ...DATA, snoozes: [snooze] }}
        recrawl={recrawl()}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: COPY.needsYou.turnBackOnLabel(
          COPY.needsYou.kinds['show-dropped'],
        ),
      }),
    );
    const retry = await screen.findByRole('button', {
      name: ADMIN_COPY.states.saveFailed.tryAgain,
    });
    expect(mockRefresh).not.toHaveBeenCalled();
    mockDelete.mockResolvedValue({ id: 'snooze-1' });
    fireEvent.click(retry);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    errorSpy.mockRestore();
  });

  it('a 404 (already back on elsewhere) logs and refreshes instead of failing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockDelete.mockRejectedValueOnce(new MockApiError(404));
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{ ...DATA, snoozes: [snooze] }}
        recrawl={recrawl()}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: COPY.needsYou.turnBackOnLabel(
          COPY.needsYou.kinds['show-dropped'],
        ),
      }),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(warnSpy).toHaveBeenCalledWith(expect.any(String), {
      id: 'snooze-1',
    });
    expect(
      screen.queryByRole('button', {
        name: ADMIN_COPY.states.saveFailed.tryAgain,
      }),
    ).toBeNull();
    warnSpy.mockRestore();
  });

  it('shows Couldn’t load for the whole card when Needs you failed', () => {
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{ ...DATA, needsYou: null }}
        recrawl={recrawl()}
      />,
    );
    const needs = within(card(COPY.needsYou.title));
    expect(needs.getByTestId('couldnt-load')).toBeTruthy();
    expect(needs.queryByText(COPY.needsYou.empty('Ball Arena'))).toBeNull();
    expect(screen.getAllByTestId('couldnt-load')).toHaveLength(1);
  });

  it('when only snoozes failed, still lists the items, failing just that section', () => {
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{
          ...DATA,
          needsYou: [{ key: 'bug:1', kind: 'bug', title: 'Prices look wrong' }],
          snoozes: null,
        }}
        recrawl={recrawl()}
      />,
    );
    const needs = within(card(COPY.needsYou.title));
    expect(needs.getByText('Prices look wrong')).toBeTruthy();
    expect(needs.getByText(COPY.needsYou.turnedOff)).toBeTruthy();
    expect(needs.getAllByTestId('couldnt-load')).toHaveLength(1);
    expect(screen.getAllByTestId('couldnt-load')).toHaveLength(1);
  });

  it('when only snoozes failed with no items, still says nothing is waiting', () => {
    render(
      <OverviewTab
        venue={buildVenue()}
        data={{ ...DATA, snoozes: null }}
        recrawl={recrawl()}
      />,
    );
    const needs = within(card(COPY.needsYou.title));
    expect(needs.getByText(COPY.needsYou.empty('Ball Arena'))).toBeTruthy();
    expect(needs.getByTestId('couldnt-load')).toBeTruthy();
  });
});
