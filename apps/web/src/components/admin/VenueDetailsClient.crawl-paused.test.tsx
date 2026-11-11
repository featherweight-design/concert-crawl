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

vi.mock('./crawl-trigger-button/CrawlTriggerButton', () => ({
  CrawlTriggerButton: () => null,
}));

// Reads triage over the network behind Clerk auth; these suites are about the
// venue form, and there is no ClerkProvider around them.
vi.mock('@/components/admin/venue-expected-badge/VenueExpectedBadge', () => ({
  VenueExpectedBadge: () => null,
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

const PILL = ADMIN_COPY.crawlPausedBadge.label;

describe('VenueDetailsClient — crawl paused pill', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the pill in the header while crawling is paused', () => {
    render(
      <VenueDetailsClient
        venue={buildVenue({ crawlPausedAt: '2026-11-10T18:00:00.000Z' })}
      />,
    );
    expect(screen.getAllByText(PILL).length).toBeGreaterThan(0);
  });

  it('shows no pill for a venue that is crawling', () => {
    render(<VenueDetailsClient venue={buildVenue()} />);
    expect(screen.queryByText(PILL)).toBeNull();
  });
});
