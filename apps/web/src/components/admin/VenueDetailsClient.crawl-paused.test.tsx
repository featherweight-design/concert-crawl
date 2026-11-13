// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';

// ───── Mocks ─────────────────────────────────────────────────────────────────

const mockUpdateVenue = vi.fn();
const mockPauseVenue = vi.fn();
const mockActivateVenue = vi.fn();
const mockHideVenue = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: (...args: unknown[]) => mockUpdateVenue(...args),
  pauseVenue: (...args: unknown[]) => mockPauseVenue(...args),
  activateVenue: (...args: unknown[]) => mockActivateVenue(...args),
  hideVenue: (...args: unknown[]) => mockHideVenue(...args),
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

vi.mock('@/components/admin/shell/PageTitleContext', () => ({
  usePageTitle: () => ({ setPageTitle: vi.fn() }),
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

// The header (status chips, Re-crawl, the ⋯ menu) has its own suites; here it
// only has to be handed the venue.
vi.mock('@/components/admin/venues/VenueHeader', () => ({
  VenueHeader: ({ venue }: { venue: { name: string } }) => (
    <div data-testid="venue-header-stub">{venue.name}</div>
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

// The old paused pill became the header's crawling chip ("Paused"), which
// `VenueHeader.test.tsx` covers. This checks the page hands the header the
// venue, and that the ⋯ menu (`VenueMenu.test.tsx`) replaced the danger zone.
describe('VenueDetailsClient — venue header', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the header for a paused venue', () => {
    render(
      <VenueDetailsClient
        venue={buildVenue({ crawlPausedAt: '2026-11-10T18:00:00.000Z' })}
      />,
    );
    expect(screen.getByTestId('venue-header-stub').textContent).toContain(
      'Test Venue',
    );
  });

  it('drops the danger zone and the old Flagship button', () => {
    render(<VenueDetailsClient venue={buildVenue({ featured: true })} />);
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

  it('keeps the old card’s crawl summary under the header until part 5', () => {
    const HEADER = ADMIN_COPY.venueHeader.summary;
    const SUMMARY = ADMIN_COPY.venueDetailsClient.summary;
    render(
      <VenueDetailsClient
        venue={buildVenue({
          extractionStrategy: 'structured_data',
          consecutiveFailures: 2,
          crawlHealth: {
            sevenDayPercent: 86,
            sparkline: [],
            lastCrawledAt: null,
            avgDurationMs: null,
            eventsTracked: 42,
            consecutiveFails: 2,
          },
        })}
      />,
    );
    const line = screen.getByTestId('venue-summary-line').textContent ?? '';
    expect(line).toContain(HEADER.strategy.structured_data);
    expect(line).toContain(HEADER.consecutiveFailures(2));
    expect(line).toContain(`${SUMMARY.lastCrawl} ${SUMMARY.never}`);
    expect(line).toContain(`42 ${SUMMARY.eventsLive}`);
    expect(line).toContain(`${SUMMARY.health} 86%`);
  });

  it('leaves the failures badge off a venue with none', () => {
    render(<VenueDetailsClient venue={buildVenue()} />);
    const line = screen.getByTestId('venue-summary-line').textContent ?? '';
    expect(line).toContain(ADMIN_COPY.venueHeader.summary.strategy.auto);
    expect(line).not.toContain('consec.');
  });
});

// The Basics Status toggle runs the ⋯ menu's actions (orchestrator ruling):
// Paused is the Hide confirm, Active is Show on site, and a taken-down venue
// can't be re-published from here.
describe('VenueDetailsClient — Status toggle', () => {
  const CONFIRMS = ADMIN_COPY.venueConfirms;
  const STATUS = ADMIN_COPY.venueDetailsClient.fields.status;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
    for (const mock of [
      mockPauseVenue,
      mockActivateVenue,
      mockHideVenue,
      mockRefresh,
    ])
      mock.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('Paused opens the Hide confirm and never calls pauseVenue', () => {
    render(<VenueDetailsClient venue={buildVenue()} />);
    fireEvent.click(screen.getByTestId('venue-status-paused'));
    expect(screen.getByText(CONFIRMS.hide.title('Test Venue'))).toBeTruthy();
    expect(mockPauseVenue).not.toHaveBeenCalled();
    expect(mockHideVenue).not.toHaveBeenCalled();
  });

  it('confirming sends hideVenue with the chosen reason, then refreshes', async () => {
    mockHideVenue.mockResolvedValue(undefined);
    render(<VenueDetailsClient venue={buildVenue()} />);
    fireEvent.click(screen.getByTestId('venue-status-paused'));
    fireEvent.click(
      screen.getByRole('radio', { name: CONFIRMS.hide.reasons.venue_closed }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: CONFIRMS.hide.confirm }),
    );
    await waitFor(() =>
      expect(mockHideVenue).toHaveBeenCalledWith(
        'venue-1',
        'venue_closed',
        null,
      ),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(mockPauseVenue).not.toHaveBeenCalled();
  });

  it('Active on a hidden venue shows it at once, as Show on site does', async () => {
    mockActivateVenue.mockResolvedValue({ ok: true });
    render(<VenueDetailsClient venue={buildVenue({ active: false })} />);
    fireEvent.click(screen.getByTestId('venue-status-active'));
    await waitFor(() =>
      expect(mockActivateVenue).toHaveBeenCalledWith('venue-1'),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  // A page loaded before the venue was removed still offers Active. The API
  // refuses it (409 venue_removed); its reason goes to the page's banner.
  it('a refused Active on a stale page shows the API’s reason', async () => {
    const refusal =
      'This venue asked us to remove its data, so it stays off the site.';
    mockActivateVenue.mockResolvedValue({ ok: false, error: refusal });
    render(<VenueDetailsClient venue={buildVenue({ active: false })} />);
    fireEvent.click(screen.getByTestId('venue-status-active'));
    expect(await screen.findByText(refusal)).toBeTruthy();
    expect(mockActivateVenue).toHaveBeenCalledWith('venue-1');
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it('a taken-down venue’s Active is disabled and says why', () => {
    render(
      <VenueDetailsClient
        venue={buildVenue({
          active: false,
          removedAt: '2026-11-02T18:00:00.000Z',
        })}
      />,
    );
    const active = screen.getByTestId('venue-status-active');
    expect(active.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(STATUS.takenDown)).toBeTruthy();
    fireEvent.click(active);
    expect(mockActivateVenue).not.toHaveBeenCalled();
  });
});
