// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';

// A venue removed at its request is never shown again from the venue page:
// the API refuses Show (409 venue_removed), so the page does not offer it.

// ───── Mocks ─────────────────────────────────────────────────────────────────

const mockActivateVenue = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: vi.fn(),
  pauseVenue: vi.fn(),
  activateVenue: (...args: unknown[]) => mockActivateVenue(...args),
  setVenueFeatured: vi.fn(),
  generateVenueAbout: vi.fn(),
  probeVenuePlatform: vi.fn(),
  pauseCrawling: vi.fn(),
  resumeCrawling: vi.fn(),
  removeVenue: vi.fn(),
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

const PAUSE = ADMIN_COPY.venueDetailsClient.dangerZone.pause;
const STATUS = ADMIN_COPY.venueDetailsClient.fields.status;
const takenAt = '2026-11-01T00:00:00.000Z';

const activateButton = () =>
  screen.getByRole('button', { name: PAUSE.activateButton });
const statusActiveButton = () =>
  within(screen.getByRole('group', { name: STATUS.ariaLabel })).getByRole(
    'button',
    { name: STATUS.active },
  );

describe('VenueDetailsClient — a removed venue', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockActivateVenue.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does not offer Activate or Active, and says why', () => {
    render(
      <VenueDetailsClient
        venue={buildVenue({
          active: false,
          crawlPausedAt: takenAt,
          removedAt: takenAt,
        })}
      />,
    );

    expect(activateButton()).toHaveProperty('disabled', true);
    expect(statusActiveButton()).toHaveProperty('disabled', true);
    expect(screen.getAllByText(PAUSE.removedNote).length).toBe(2);
    expect(screen.getByTestId('venue-status-removed')).toBeTruthy();

    fireEvent.click(activateButton());
    fireEvent.click(statusActiveButton());
    expect(mockActivateVenue).not.toHaveBeenCalled();
  });

  it('still offers Activate on a hidden venue that was never removed', () => {
    render(<VenueDetailsClient venue={buildVenue({ active: false })} />);

    expect(activateButton()).toHaveProperty('disabled', false);
    expect(statusActiveButton()).toHaveProperty('disabled', false);
    expect(screen.queryByText(PAUSE.removedNote)).toBeNull();
    expect(screen.queryByTestId('venue-status-removed')).toBeNull();
  });

  it("shows the API's refusal when a stale page sends Show", async () => {
    const refusal =
      'This venue asked us to remove its data, so it stays off the site.';
    mockActivateVenue.mockResolvedValueOnce({ ok: false, error: refusal });
    render(<VenueDetailsClient venue={buildVenue({ active: false })} />);

    fireEvent.click(activateButton());
    expect(await screen.findByText(refusal)).toBeTruthy();
    expect(mockActivateVenue).toHaveBeenCalledWith('venue-1');
  });
});
