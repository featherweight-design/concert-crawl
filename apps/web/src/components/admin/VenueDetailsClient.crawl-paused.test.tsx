// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';

// ───── Mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/actions/venues', () => ({
  updateVenue: vi.fn(),
  pauseVenue: vi.fn(),
  activateVenue: vi.fn(),
  hideVenue: vi.fn(),
  removeVenue: vi.fn(),
  tryDeleteVenue: vi.fn(),
  setVenueFeatured: vi.fn(),
  generateVenueAbout: vi.fn(),
  probeVenuePlatform: vi.fn(),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('test-token') }),
}));

vi.mock('@/components/admin/shell/PageTitleContext', () => ({
  usePageTitle: () => ({ setPageTitle: vi.fn(), setPhoneBack: vi.fn() }),
}));

vi.mock('@/components/consumer/identity-art/IdentityArt', () => ({
  IdentityArt: () => null,
  ia_getInitials: () => 'TV',
  ia_isDark: () => true,
  identityFor: () => ({ palette: { bg: '#101010' } }),
}));

vi.mock('./generate-field/GenerateField', () => ({
  GenerateField: () => null,
}));

// The page owns the one re-crawl and hands it to the header and Overview.
const mockStart = vi.fn();
const recrawlState = { current: 'idle' };
vi.mock('@/components/admin/venues/useRecrawl', () => ({
  useRecrawl: () => ({
    state: recrawlState.current,
    reason: null,
    start: (...args: unknown[]) => mockStart(...args),
    retry: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// The header (status chips, Re-crawl, the ⋯ menu) has its own suites; here it
// only has to be handed the venue and the page's re-crawl.
// The Runs tab fetches behind Clerk auth; it has its own suite.
vi.mock('@/components/admin/venues/runs/RunsTab', () => ({
  RunsTab: () => null,
}));

vi.mock('@/components/admin/venues/VenueHeader', () => ({
  VenueHeader: ({
    venue,
    recrawl,
  }: {
    venue: { name: string };
    recrawl: { start: () => void };
  }) => (
    <button
      type="button"
      data-testid="venue-header-stub"
      onClick={() => recrawl.start()}
    >
      {venue.name}
    </button>
  ),
}));

import { VenueDetailsClient } from './VenueDetailsClient';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

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
  name: 'Test Venue',
  slug: 'test-venue',
  websiteUrl: 'https://testvenue.example.com',
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
  ...overrides,
});

const ACTIONS = ADMIN_COPY.venueDetailsClient.actions;
const DANGER = ADMIN_COPY.venueDetailsClient.dangerZone;
const OVERVIEW = ADMIN_COPY.venueOverview;

beforeEach(() => {
  vi.stubGlobal('matchMedia', matchMediaStub);
  mockStart.mockReset();
  mockRefresh.mockReset();
  recrawlState.current = 'idle';
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The old paused pill became the header's crawling chip ("Paused"), which
// `VenueHeader.test.tsx` covers. This checks the page hands the header the
// venue, and that the ⋯ menu (`VenueMenu.test.tsx`) replaced the danger zone.
describe('VenueDetailsClient — venue header', () => {
  it('renders the header for a paused venue', () => {
    render(
      <VenueDetailsClient
        initialTab="details"
        venue={buildVenue({ crawlPausedAt: '2026-11-10T18:00:00.000Z' })}
      />,
    );
    expect(screen.getByTestId('venue-header-stub').textContent).toContain(
      'Test Venue',
    );
  });

  it('drops the danger zone and the old Flagship button', () => {
    render(
      <VenueDetailsClient
        initialTab="details"
        venue={buildVenue({ featured: true })}
      />,
    );
    expect(
      screen.queryByText(
        ADMIN_COPY.venueDetailsClient.sections.dangerZone.title,
      ),
    ).toBeNull();
    for (const name of [
      ACTIONS.flagship,
      DANGER.crawlPause.pauseButton,
      DANGER.remove.trigger,
      DANGER.pause.pauseButton,
      DANGER.pause.activateButton,
    ]) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    expect(screen.queryByTestId('crawl-pause-line')).toBeNull();
    expect(screen.queryByText(DANGER.delete.description)).toBeNull();
  });
});

// 3b part 3: the Overview cards replace the summary line, and the Basics
// Status toggle is gone (Live and Hidden are the header's chip and ⋯ menu).
describe('VenueDetailsClient — Overview', () => {
  it('draws the Overview cards, not the old summary line', () => {
    render(<VenueDetailsClient venue={buildVenue({ latestRun: null })} />);
    expect(screen.getByTestId('venue-overview')).toBeTruthy();
    expect(screen.queryByTestId('venue-summary-line')).toBeNull();
    expect(
      screen.getByRole('region', { name: OVERVIEW.latestRun.title }),
    ).toBeTruthy();
    expect(
      screen.getByText(ADMIN_COPY.venuesList.latestRun.never),
    ).toBeTruthy();
  });

  it('has no Status toggle on Details, and no taken-down line', () => {
    render(
      <VenueDetailsClient
        initialTab="details"
        venue={buildVenue({
          active: false,
          removedAt: '2026-11-02T18:00:00.000Z',
        })}
      />,
    );
    for (const status of ['active', 'paused', 'blocked']) {
      expect(screen.queryByTestId(`venue-status-${status}`)).toBeNull();
    }
    expect(screen.queryByRole('group', { name: 'Venue status' })).toBeNull();
  });

  it('Re-crawl anyway starts the page’s one re-crawl, forced', () => {
    render(
      <VenueDetailsClient
        venue={buildVenue({
          latestRun: {
            id: 'run-9',
            status: 'skipped',
            reason: 'page_unchanged',
            at: '2026-11-11T10:02:00.000Z',
            eventsFound: 0,
            eventsInserted: 0,
            errorMessage: null,
          },
          lastFullRun: { at: '2026-11-10T10:00:00.000Z', eventsFound: 106 },
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: OVERVIEW.latestRun.recrawlAnyway }),
    );
    expect(mockStart).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByTestId('venue-header-stub'));
    expect(mockStart).toHaveBeenLastCalledWith();
  });

  it('Re-crawl anyway holds while the shared re-crawl is busy', () => {
    recrawlState.current = 'running';
    render(
      <VenueDetailsClient
        venue={buildVenue({
          latestRun: {
            id: 'run-9',
            status: 'skipped',
            reason: 'page_unchanged',
            at: '2026-11-11T10:02:00.000Z',
            eventsFound: 0,
            eventsInserted: 0,
            errorMessage: null,
          },
        })}
      />,
    );
    const button = screen.getByRole('button', {
      name: OVERVIEW.latestRun.recrawlAnyway,
    });
    // Held as the header's Re-crawl is: focusable, announced as unavailable.
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
  });
});
