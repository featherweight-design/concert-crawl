// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
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

vi.mock('./generate-field/GenerateField', () => ({
  GenerateField: () => null,
}));

// The header polls crawls behind Clerk auth; it has its own suite.
vi.mock('@/components/admin/venues/VenueHeader', () => ({
  VenueHeader: () => null,
}));

vi.mock('@/components/admin/venues/useRecrawl', () => ({
  useRecrawl: () => ({
    state: 'idle',
    reason: null,
    start: () => undefined,
    retry: () => undefined,
    dismiss: () => undefined,
  }),
}));
vi.mock('@/components/admin/venues/overview/OverviewTab', () => ({
  OverviewTab: () => null,
}));
vi.mock('@/components/admin/venues/runs/RunsTab', () => ({
  RunsTab: () => null,
}));
vi.mock('@/components/admin/venue-expected-badge/VenueExpectedBadge', () => ({
  VenueExpectedBadge: () => null,
}));

import { VenueDetailsClient } from './VenueDetailsClient';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

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

// The crawl config moved out of the page's one form into the Source tab, with
// its own save (3b part 6). The page's bar must never send a Source field or a
// crawl rule; SourceTab's own suite covers the tab.
describe('VenueDetailsClient — Source is split out (3b part 6)', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockUpdateVenue.mockReset();
    mockUpdateVenue.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('mounts the Source tab in the Source panel, with no old crawl config', () => {
    render(<VenueDetailsClient initialTab="source" venue={buildVenue()} />);
    const sourcePanel = screen.getByTestId('venue-panel-source');
    expect(sourcePanel.querySelector('[data-testid="venue-source"]')).not.toBe(
      null,
    );
    for (const id of [
      'edit-venue-platform',
      'edit-venue-crawl-delay',
      'edit-venue-extraction-strategy',
      'edit-venue-api-provider',
      'edit-venue-debug-capture-html',
      'edit-venue-url',
    ]) {
      expect(document.getElementById(id)).toBeNull();
    }
  });

  it('the page’s save sends Details fields and no Source field or crawl rule', async () => {
    render(
      <VenueDetailsClient
        initialTab="details"
        venue={buildVenue({ platform: 'aeg', platformVenueId: '89' })}
      />,
    );
    const address = document.getElementById('edit-venue-address');
    if (!(address instanceof HTMLInputElement)) {
      throw new Error('Expected #edit-venue-address to be an input');
    }
    fireEvent.change(address, { target: { value: '1 Colfax Ave' } });
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    const formData = mockUpdateVenue.mock.calls[0]?.[1];
    if (!(formData instanceof FormData)) {
      throw new Error('Expected updateVenue to receive a FormData');
    }
    expect(formData.get('address')).toBe('1 Colfax Ave');
    for (const key of [
      'websiteUrl',
      'extractionStrategy',
      'platform',
      'platformVenueId',
      'apiProvider',
      'apiAccountId',
      'crawlMode',
      'crawlWaitUntil',
      'crawlWaitForSelector',
      'debugCaptureHtml',
      'crawlDelayMs',
      'robotsTxtAllowed',
    ]) {
      expect(formData.has(key)).toBe(false);
    }
  });

  it('an edit in Source does not raise the page’s bar', () => {
    render(<VenueDetailsClient initialTab="source" venue={buildVenue()} />);
    fireEvent.change(
      screen.getByLabelText(ADMIN_COPY.venueSource.read.calendarPage.label),
      { target: { value: 'https://gothic.example/calendar' } },
    );
    expect(screen.queryByRole('button', { name: SAVE_LABEL })).toBeNull();
    expect(
      screen.getByRole('button', { name: ADMIN_COPY.venueSource.saveBar.save }),
    ).toBeTruthy();
  });
});
