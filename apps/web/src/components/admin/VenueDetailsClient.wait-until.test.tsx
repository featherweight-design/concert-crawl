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
import { MIN_CRAWL_DELAY_MS } from '@concert-crawl/types';

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

// The page's one re-crawl and the Overview cards sit behind Clerk auth and
// have their own suites.
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
// The Runs tab fetches behind Clerk auth; it has its own suite.
vi.mock('@/components/admin/venues/runs/RunsTab', () => ({
  RunsTab: () => null,
}));

// Reads triage over the network behind Clerk auth; these suites are about the
// venue form, and there is no ClerkProvider around them.
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

const WAIT_COPY = ADMIN_COPY.venueDetailsClient.fields.waitUntil;

describe('VenueDetailsClient — Wait until control', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockUpdateVenue.mockReset();
    mockUpdateVenue.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the venue's current setting and its hint", () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlWaitUntil: 'load' })}
      />,
    );

    expect(screen.getByText(WAIT_COPY.hints.load)).toBeTruthy();
  });

  it('sends the chosen value to updateVenue on save', async () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlWaitUntil: 'networkidle' })}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: WAIT_COPY.options.load }),
    );
    expect(screen.getByText(WAIT_COPY.hints.load)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mockUpdateVenue).toHaveBeenCalledTimes(1);
    });

    const call = mockUpdateVenue.mock.calls[0];
    if (!call) throw new Error('Expected updateVenue to have been called');
    const [, formData] = call;
    if (!(formData instanceof FormData)) {
      throw new Error('Expected updateVenue to receive a FormData');
    }
    expect(formData.get('crawlWaitUntil')).toBe('load');
    // Pause and Activate own `active`; a save from a stale tab must not
    // resend it.
    expect(formData.has('active')).toBe(false);
  });

  it("marks the Wait selector with the API's reason when the guard refuses a save (#1344)", async () => {
    const reason =
      'crawlWaitForSelector is required for browser-mode venues: without it a slow client-side render is captured as an empty page';
    mockUpdateVenue.mockResolvedValueOnce({
      success: false,
      error: reason,
      field: 'crawlWaitForSelector',
    });
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlWaitUntil: 'networkidle' })}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: WAIT_COPY.options.load }),
    );
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    const message = await screen.findByText(reason);
    // At the field, not in the page-top banner: the input is marked invalid
    // and the reason renders in the same field block.
    const input = document.getElementById('edit-venue-wait-for-selector');
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.parentElement?.contains(message)).toBe(true);
    // Linked for screen readers, and announced when it appears.
    expect(input?.getAttribute('aria-describedby')).toBe(message.id);
    expect(message.getAttribute('role')).toBe('alert');
    expect(
      screen.queryByText(ADMIN_COPY.venueDetailsClient.errors.unexpected),
    ).toBeNull();
  });

  it('says the setting is ignored while a Wait selector is set', () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlWaitForSelector: '.event-card' })}
      />,
    );

    expect(screen.getByText(WAIT_COPY.ignoredWithSelector)).toBeTruthy();
  });

  it('says the setting is ignored in HTTP only mode', () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlMode: 'http' })}
      />,
    );

    expect(screen.getByText(WAIT_COPY.ignoredHttpOnly)).toBeTruthy();
  });

  it('describes HTTP only when a selector is also set', () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({
          crawlMode: 'http',
          crawlWaitForSelector: '.event-card',
        })}
      />,
    );

    expect(screen.getByText(WAIT_COPY.ignoredHttpOnly)).toBeTruthy();
  });

  it('marks the selected option as pressed', () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlWaitUntil: 'load' })}
      />,
    );

    const load = screen.getByRole('button', { name: WAIT_COPY.options.load });
    const idle = screen.getByRole('button', {
      name: WAIT_COPY.options.networkidle,
    });
    expect(load.getAttribute('aria-pressed')).toBe('true');
    expect(idle.getAttribute('aria-pressed')).toBe('false');
  });

  // The API re-checks the browser-mode selector rule whenever a gate field is
  // in the body, so resending them unchanged made this venue unsaveable.
  it('omits unchanged browser-gate fields for a browser venue with no selector', async () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlMode: 'browser', crawlWaitForSelector: null })}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: WAIT_COPY.options.load }),
    );
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mockUpdateVenue).toHaveBeenCalledTimes(1);
    });
    const formData = mockUpdateVenue.mock.calls[0]?.[1];
    if (!(formData instanceof FormData)) {
      throw new Error('Expected updateVenue to receive a FormData');
    }
    expect(formData.get('crawlWaitUntil')).toBe('load');
    for (const key of [
      'crawlMode',
      'crawlWaitForSelector',
      'platform',
      'platformVenueId',
      'apiProvider',
      'apiAccountId',
    ]) {
      expect(formData.has(key)).toBe(false);
    }
  });

  it('sends the whole browser-gate group when one of its fields changes', async () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlMode: 'browser', crawlWaitForSelector: null })}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText(
        ADMIN_COPY.venueDetailsClient.fields.waitSelector.placeholder,
      ),
      { target: { value: '.event-card' } },
    );
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mockUpdateVenue).toHaveBeenCalledTimes(1);
    });
    const formData = mockUpdateVenue.mock.calls[0]?.[1];
    if (!(formData instanceof FormData)) {
      throw new Error('Expected updateVenue to receive a FormData');
    }
    expect(formData.get('crawlWaitForSelector')).toBe('.event-card');
    expect(formData.get('crawlMode')).toBe('browser');
    expect(formData.get('apiProvider')).toBe('');
  });
});

// The form once accepted 1 s, and the API now refuses anything under 3 s, so
// a legacy row has to start at the floor or no field on it could be saved.
const DELAY_LABEL = ADMIN_COPY.venueDetailsClient.fields.requestDelay.label;

describe('VenueDetailsClient — Request delay below the 3 s floor', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockUpdateVenue.mockReset();
    mockUpdateVenue.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows a legacy 1000ms delay as 3000', () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlDelayMs: 1000 })}
      />,
    );

    const input = document.getElementById('edit-venue-crawl-delay');
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the request delay input');
    }
    expect(input.value).toBe('3000');
    // The hint states the minimum the field enforces, from the one constant.
    const hint = ADMIN_COPY.venueDetailsClient.fields.requestDelay.hint;
    expect(hint).toContain(`at least ${String(MIN_CRAWL_DELAY_MS)}`);
    expect(screen.getByText(hint)).toBeTruthy();
  });

  it('reads as changed from the start, naming Request delay', () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlDelayMs: 1000 })}
      />,
    );

    // The save bar is up before any edit, so the admin can save the fix.
    expect(screen.getByRole('button', { name: SAVE_LABEL })).toBeTruthy();
    // Listed in the save bar as well as labelling the field.
    expect(screen.getAllByText(DELAY_LABEL)).toHaveLength(2);
  });

  it('opens clean for a row already at the floor', () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlDelayMs: 3000 })}
      />,
    );

    expect(screen.queryByRole('button', { name: SAVE_LABEL })).toBeNull();
    expect(screen.getAllByText(DELAY_LABEL)).toHaveLength(1);
  });

  it('names the delay change alongside an unrelated edit', () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlDelayMs: 1000 })}
      />,
    );

    const name = document.getElementById('edit-venue-name');
    if (!(name instanceof HTMLInputElement)) {
      throw new Error('Expected the name input');
    }
    fireEvent.change(name, { target: { value: 'Renamed Venue' } });

    expect(screen.getByText(`Name · ${DELAY_LABEL}`)).toBeTruthy();
  });

  it('sends 3000 when another field is saved, correcting the row', async () => {
    render(
      <VenueDetailsClient
        initialTab="source"
        venue={buildVenue({ crawlDelayMs: 1000 })}
      />,
    );

    const name = document.getElementById('edit-venue-name');
    if (!(name instanceof HTMLInputElement)) {
      throw new Error('Expected the name input');
    }
    fireEvent.change(name, { target: { value: 'Renamed Venue' } });
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    await waitFor(() => {
      expect(mockUpdateVenue).toHaveBeenCalledTimes(1);
    });
    const formData = mockUpdateVenue.mock.calls[0]?.[1];
    if (!(formData instanceof FormData)) {
      throw new Error('Expected updateVenue to receive a FormData');
    }
    expect(formData.get('name')).toBe('Renamed Venue');
    expect(formData.get('crawlDelayMs')).toBe('3000');
  });
});
