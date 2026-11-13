// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';

// ───── Mocks ─────────────────────────────────────────────────────────────────

const mockUpdateVenue = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: (...args: unknown[]) => mockUpdateVenue(...args),
  pauseVenue: vi.fn(),
  activateVenue: vi.fn(),
  setVenueFeatured: vi.fn(),
  generateVenueAbout: vi.fn(),
  probeVenuePlatform: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
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

vi.mock('./DeleteVenueConfirm', () => ({
  DeleteVenueConfirm: () => null,
}));

vi.mock('./generate-field/GenerateField', () => ({
  GenerateField: () => null,
}));

// The header (status chips, Re-crawl) has its own suite; here it only has to
// be handed the venue and the Flagship button it carries for now.
vi.mock('@/components/admin/venues/VenueHeader', () => ({
  VenueHeader: ({
    venue,
    actions,
  }: {
    venue: { name: string };
    actions?: ReactNode;
  }) => (
    <div data-testid="venue-header-stub">
      {venue.name}
      {actions}
    </div>
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

// The old paused pill became the header's crawling chip ("Paused"), which
// `VenueHeader.test.tsx` covers. This checks the page hands the header the
// venue and keeps the Flagship button until the ⋯ menu lands.
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

  it('keeps the Flagship button in the header', () => {
    render(<VenueDetailsClient venue={buildVenue({ featured: true })} />);
    expect(screen.getByRole('button', { name: ACTIONS.flagship })).toBeTruthy();
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
