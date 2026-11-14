// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import type { VenueWithCrawlHealth } from '@concert-crawl/types';

// ───── Mocks ─────────────────────────────────────────────────────────────────

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: mockReplace }),
}));

const mockUpdateVenue = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: (...args: unknown[]) => mockUpdateVenue(...args),
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
const mockRunsTab = vi.fn(({ venueId }: { venueId: string }) => (
  <span data-testid="mock-runs-tab">{venueId}</span>
));
vi.mock('@/components/admin/venues/runs/RunsTab', () => ({
  RunsTab: (props: { venueId: string }) => mockRunsTab(props),
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
    mockUpdateVenue.mockReset();
    mockUpdateVenue.mockResolvedValue({ success: true });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  it('switches on the client: history.replaceState, never router.replace', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    render(<VenueDetailsClient venue={venue} />);
    fireEvent.click(screen.getByRole('tab', { name: TABS.runs }));
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0]?.[2]).toBe(
      '/admin/venues/venue-1?tab=runs',
    );
    expect(window.location.search).toBe('?tab=runs');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(panel('runs').hidden).toBe(false);
    // The Runs tab replaces the interim Crawl runs link.
    expect(screen.getByTestId('mock-runs-tab').textContent).toBe('venue-1');
    expect(screen.queryByRole('link', { name: 'Open Crawl runs' })).toBeNull();
  });

  it('hands the Runs tab its first page and the ?run= to open', () => {
    render(
      <VenueDetailsClient
        venue={venue}
        initialTab="runs"
        runs={{ runs: null, initialRun: 'run-7' }}
      />,
    );
    expect(mockRunsTab).toHaveBeenCalledWith({
      venueId: 'venue-1',
      runs: null,
      initialRun: 'run-7',
      active: true,
    });
  });

  it('tells the Runs tab when another tab takes over, so its run detail closes', () => {
    render(
      <VenueDetailsClient
        venue={venue}
        initialTab="runs"
        runs={{ runs: null, initialRun: 'run-7' }}
      />,
    );
    fireEvent.click(screen.getByRole('tab', { name: TABS.details }));
    expect(mockRunsTab).toHaveBeenLastCalledWith(
      expect.objectContaining({ active: false }),
    );
    expect(window.location.search).toBe('?tab=details');
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

  it('brings a strip scrolled above the fold back into view, and only then', () => {
    render(<VenueDetailsClient venue={venue} />);
    const strip = screen.getByTestId('venue-tabs');
    const scrollSpy = vi.fn();
    strip.scrollIntoView = scrollSpy;
    const rect = strip.getBoundingClientRect();
    const rectSpy = vi.spyOn(strip, 'getBoundingClientRect');

    rectSpy.mockReturnValue({ ...rect, top: 120 });
    fireEvent.click(screen.getByRole('tab', { name: TABS.runs }));
    expect(scrollSpy).not.toHaveBeenCalled();

    rectSpy.mockReturnValue({ ...rect, top: -300 });
    fireEvent.click(screen.getByRole('tab', { name: TABS.source }));
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'start' });
  });

  // Source has its own bar (3b part 6): the page's bar submits Details' edits
  // from any tab, and never Source's.
  it('a save from Overview submits the Details edit and nothing of Source', async () => {
    render(<VenueDetailsClient venue={venue} />);
    fireEvent.change(addressInput(), { target: { value: '1 Colfax Ave' } });
    expect(panel('overview').hidden).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    const formData = mockUpdateVenue.mock.calls[0]?.[1];
    if (!(formData instanceof FormData)) {
      throw new Error('Expected updateVenue to receive a FormData');
    }
    expect(formData.get('address')).toBe('1 Colfax Ave');
    expect(formData.has('crawlWaitUntil')).toBe(false);
    expect(formData.has('websiteUrl')).toBe(false);
  });

  it('keeps an unsaved Source edit, and its own bar, across a tab switch', () => {
    render(<VenueDetailsClient venue={venue} initialTab="source" />);
    fireEvent.change(
      screen.getByLabelText(ADMIN_COPY.venueSource.read.calendarPage.label),
      { target: { value: 'https://gothic.example/calendar' } },
    );
    fireEvent.click(screen.getByRole('tab', { name: TABS.details }));
    fireEvent.click(screen.getByRole('tab', { name: TABS.source }));
    expect(
      screen.getByRole('button', { name: ADMIN_COPY.venueSource.saveBar.save }),
    ).toBeTruthy();
  });
});

// A refused save marks a field that may sit in a hidden panel: the page opens
// that field's tab, focuses it, and says which field in the banner.
describe('VenueDetailsClient — a refused save opens the field’s tab', () => {
  const FIELDS = ADMIN_COPY.venueDetailsClient.fields;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockUpdateVenue.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const saveFromOverview = (overrides: Partial<VenueWithCrawlHealth>) => {
    render(<VenueDetailsClient venue={{ ...venue, ...overrides }} />);
    fireEvent.change(addressInput(), { target: { value: '1 Colfax Ave' } });
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));
  };

  const expectOpenedAt = async (
    tab: 'details',
    inputId: string,
    label: string,
  ) => {
    await waitFor(() => expect(document.activeElement?.id).toBe(inputId));
    expect(panel(tab).hidden).toBe(false);
    expect(panel('overview').hidden).toBe(true);
    expect(
      screen
        .getByRole('tab', { name: TABS[tab] })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.getByTestId('venue-save-error').textContent).toContain(
      TABS.refused(label, TABS[tab]),
    );
  };

  // Source's fields are refused on Source's own bar (3b part 6), so the only
  // field this bar can be refused on is the slug.
  it('the API refusing slug opens details and focuses it', async () => {
    mockUpdateVenue.mockResolvedValue({
      success: false,
      field: 'slug',
      error: 'slug was refused',
    });
    saveFromOverview({});
    await expectOpenedAt('details', 'edit-venue-slug', FIELDS.slug.label);
    expect(screen.getByText('slug was refused')).toBeTruthy();
  });

  it('an old venue with an AEG platform and no ID still saves Details', async () => {
    mockUpdateVenue.mockResolvedValue({ success: true });
    saveFromOverview({ platform: 'aeg', platformVenueId: null });
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
  });
});
