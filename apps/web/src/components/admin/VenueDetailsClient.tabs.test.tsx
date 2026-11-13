// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';

// ───── Mocks ─────────────────────────────────────────────────────────────────

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: mockReplace }),
}));

vi.mock('@/lib/actions/venues', () => ({
  updateVenue: vi.fn(),
  pauseVenue: vi.fn(),
  activateVenue: vi.fn(),
  setVenueFeatured: vi.fn(),
  generateVenueAbout: vi.fn(),
  probeVenuePlatform: vi.fn(),
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

// The header polls crawls behind Clerk auth; it has its own suite.
vi.mock('@/components/admin/venues/VenueHeader', () => ({
  VenueHeader: () => null,
}));

vi.mock('@/components/admin/venue-expected-badge/VenueExpectedBadge', () => ({
  VenueExpectedBadge: () => null,
}));

import { VenueDetailsClient } from './VenueDetailsClient';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const TABS = ADMIN_COPY.venueDetailsClient.tabs;
const SAVE_LABEL = ADMIN_COPY.venueDetailsClient.saveBar.saveChanges;

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

const venue: VenueWithCrawlHealth = {
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
};

const panel = (key: string) => screen.getByTestId(`venue-panel-${key}`);
const addressInput = (): HTMLInputElement => {
  const input = document.getElementById('edit-venue-address');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected #edit-venue-address to be an input');
  }
  return input;
};

describe('VenueDetailsClient — tabs', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockReplace.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens on Overview, with all five panels mounted and the rest hidden', () => {
    render(<VenueDetailsClient venue={venue} />);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      TABS.overview,
      TABS.runs,
      TABS.source,
      TABS.details,
      TABS.guide,
    ]);
    expect(
      screen
        .getByRole('tab', { name: TABS.overview })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(panel('overview').hidden).toBe(false);
    for (const key of ['runs', 'source', 'details', 'guide']) {
      expect(panel(key).hidden).toBe(true);
      expect(panel(key).getAttribute('aria-labelledby')).toBe(
        `venue-tab-${key}`,
      );
    }
  });

  it('opens on the tab the URL named', () => {
    render(<VenueDetailsClient venue={venue} initialTab="source" />);
    expect(panel('source').hidden).toBe(false);
    expect(panel('overview').hidden).toBe(true);
  });

  it('switches with router.replace, keeping the scroll', () => {
    render(<VenueDetailsClient venue={venue} />);
    fireEvent.click(screen.getByRole('tab', { name: TABS.runs }));
    expect(mockReplace).toHaveBeenCalledWith('/admin/venues/venue-1?tab=runs', {
      scroll: false,
    });
    expect(panel('runs').hidden).toBe(false);
    expect(
      screen.getByTestId('venue-runs-interim-link').getAttribute('href'),
    ).toBe('/admin/crawl?venueId=venue-1&tab=history');
  });

  it('keeps an unsaved edit, and the save bar, across a tab switch', () => {
    render(<VenueDetailsClient venue={venue} initialTab="details" />);
    fireEvent.change(addressInput(), { target: { value: '1 Colfax Ave' } });
    expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: TABS.guide }));
    expect(panel('details').hidden).toBe(true);
    // The global save bar still offers the edit made in Details.
    expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: TABS.details }));
    expect(addressInput().value).toBe('1 Colfax Ave');
  });

  it('follows a new ?tab= from the server', () => {
    const { rerender } = render(
      <VenueDetailsClient venue={venue} initialTab="overview" />,
    );
    rerender(<VenueDetailsClient venue={venue} initialTab="guide" />);
    expect(panel('guide').hidden).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('drops the old Back to venues and Crawl history buttons', () => {
    render(<VenueDetailsClient venue={venue} />);
    expect(screen.queryByRole('button', { name: 'Back to venues' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Crawl history' })).toBeNull();
  });
});
