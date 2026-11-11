// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import type { VenueWithEventCount } from '@concert-crawl/types';

vi.mock('@/lib/actions/venues', () => ({
  bulkVerifyVenues: vi.fn(),
  bulkUnverifyVenues: vi.fn(),
  bulkActivateVenues: vi.fn(),
  bulkDeactivateVenues: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/admin/VenueQuickView', () => ({
  VenueQuickView: () => null,
}));

import { VenueTableClient } from './venue-table-client';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const PILL = ADMIN_COPY.crawlPausedBadge.label;

const stubViewport = (mobile: boolean) =>
  vi.stubGlobal('matchMedia', (query: string): MediaQueryList => ({
    matches: mobile,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));

const buildVenue = (
  overrides: Partial<VenueWithEventCount> = {},
): VenueWithEventCount => ({
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
  eventCount: 0,
  lastRunStatus: 'success',
  ...overrides,
});

describe('VenueTableClient — crawl paused pill', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // The desktop table and the mobile cards are separate render paths, so
  // each one is checked.
  it.each([
    ['desktop table', false],
    ['mobile cards', true],
  ])('marks only the paused venue in the %s', async (_name, mobile) => {
    stubViewport(mobile);
    render(
      <VenueTableClient
        venues={[
          buildVenue({
            id: 'paused',
            name: 'Paused Venue',
            crawlPausedAt: '2026-11-10T18:00:00.000Z',
          }),
          buildVenue({ id: 'crawling', name: 'Crawling Venue' }),
        ]}
      />,
    );
    await waitFor(() => expect(screen.getAllByText(PILL)).toHaveLength(1));
  });
});
