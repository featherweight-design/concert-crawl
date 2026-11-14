// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from '@testing-library/react';

// Wait until, the selector and page loading moved from the page's one form
// into Source's Advanced row (3b part 6). These keep the browser-gate rule
// they pinned: the API re-checks the browser-mode selector whenever a gate
// field is in the body, so an unchanged one must stay out of it.

const mockUpdateVenue = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: (...args: unknown[]) => mockUpdateVenue(...args),
  probeVenuePlatform: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  SourceTab,
  type SourceVenue,
} from '@/components/admin/venues/source/SourceTab';

const ADVANCED = ADMIN_COPY.venueSource.advanced;
const SAVE_LABEL = ADMIN_COPY.venueSource.saveBar.save;

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

const browserVenue: SourceVenue = {
  id: 'venue-1',
  name: 'Test Venue',
  websiteUrl: 'https://testvenue.example.com',
  extractionStrategy: null,
  platform: null,
  platformVenueId: null,
  apiProvider: null,
  apiAccountId: null,
  crawlMode: 'browser',
  crawlWaitUntil: 'networkidle',
  crawlWaitForSelector: null,
  crawlDelayMs: 3000,
  robotsTxtAllowed: true,
  robotsTxtCheckedAt: null,
};

const openAdvanced = () =>
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(ADVANCED.label) }),
  );

const sent = async (): Promise<FormData> => {
  await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
  const formData = mockUpdateVenue.mock.calls[0]?.[1];
  if (!(formData instanceof FormData)) {
    throw new Error('Expected updateVenue to receive a FormData');
  }
  return formData;
};

describe('Source Advanced — the browser gate', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockUpdateVenue.mockReset();
    mockUpdateVenue.mockResolvedValue({ success: true });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('a browser venue with no selector can still change Wait until alone', async () => {
    render(<SourceTab venue={browserVenue} />);
    openAdvanced();
    fireEvent.click(
      screen.getByRole('radio', { name: ADVANCED.waitUntil.load }),
    );
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    const formData = await sent();
    expect([...formData.keys()]).toEqual(['crawlWaitUntil']);
    expect(formData.get('crawlWaitUntil')).toBe('load');
  });

  it('sends a new selector without resending the unchanged gate fields', async () => {
    render(<SourceTab venue={browserVenue} />);
    openAdvanced();
    fireEvent.change(screen.getByLabelText(ADVANCED.waitFor.label), {
      target: { value: ' .event-card ' },
    });
    fireEvent.click(screen.getByRole('button', { name: SAVE_LABEL }));

    const formData = await sent();
    expect([...formData.keys()]).toEqual(['crawlWaitForSelector']);
    expect(formData.get('crawlWaitForSelector')).toBe('.event-card');
  });

  it('reads page loading as Automatic for a venue the crawler has not pinned', () => {
    render(<SourceTab venue={{ ...browserVenue, crawlMode: null }} />);
    openAdvanced();
    const loading = within(
      screen.getByRole('radiogroup', { name: ADVANCED.pageLoading.label }),
    );
    // ⏸ pending Design item 18: Automatic is kept as a third segment.
    expect(
      loading.getByRole('radio', { name: ADVANCED.pageLoading.auto }),
    ).toHaveProperty('checked', true);
    for (const name of [
      ADVANCED.pageLoading.http,
      ADVANCED.pageLoading.browser,
    ]) {
      expect(loading.getByRole('radio', { name })).toHaveProperty(
        'checked',
        false,
      );
    }
  });
});
