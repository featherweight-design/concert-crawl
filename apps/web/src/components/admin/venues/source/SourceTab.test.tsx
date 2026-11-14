// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

const mockUpdateVenue = vi.fn();
const mockProbe = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  updateVenue: (...args: unknown[]) => mockUpdateVenue(...args),
  probeVenuePlatform: (...args: unknown[]) => mockProbe(...args),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), replace: vi.fn() }),
}));

import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { SourceTab, type SourceVenue } from './SourceTab';

const COPY = ADMIN_COPY.venueSource;
const MODES = COPY.read.modes;

let phone = false;
const matchMediaStub = (query: string): MediaQueryList => ({
  matches: phone,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

const venue: SourceVenue = {
  id: 'venue-1',
  name: 'Gothic',
  websiteUrl: 'https://gothic.example/events',
  extractionStrategy: null,
  platform: null,
  platformVenueId: null,
  apiProvider: null,
  apiAccountId: null,
  crawlMode: 'http',
  crawlWaitUntil: 'networkidle',
  crawlWaitForSelector: null,
  crawlDelayMs: 3000,
  robotsTxtAllowed: true,
  robotsTxtCheckedAt: '2026-11-11T10:00:00.000Z',
};

const radio = (name: string) => screen.getByRole('radio', { name });
/** Reader and Page loading both offer Automatic, so look inside the group. */
const groupRadio = (group: string, name: string) =>
  within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', {
    name,
  });
const readerRadio = (name: string) =>
  groupRadio(COPY.advanced.reader.label, name);
const loadingRadio = (name: string) =>
  groupRadio(COPY.advanced.pageLoading.label, name);
const calendarInput = () => screen.getByLabelText(COPY.read.calendarPage.label);
const saveButton = () =>
  screen.queryByRole('button', { name: COPY.saveBar.save });
const clickSave = () =>
  fireEvent.click(screen.getByRole('button', { name: COPY.saveBar.save }));
const sentFormData = (): FormData => {
  const formData = mockUpdateVenue.mock.calls[0]?.[1];
  if (!(formData instanceof FormData)) {
    throw new Error('Expected updateVenue to receive a FormData');
  }
  return formData;
};

beforeEach(() => {
  phone = false;
  vi.stubGlobal('matchMedia', matchMediaStub);
  mockUpdateVenue.mockReset();
  mockUpdateVenue.mockResolvedValue({ success: true });
  mockProbe.mockReset();
  mockRefresh.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('SourceTab — How we read it', () => {
  it.each([
    [{}, MODES.page.label],
    [{ apiProvider: 'venuepilot', apiAccountId: '1105' }, MODES.feed.label],
    [{ platform: 'aeg', platformVenueId: '89' }, MODES.feed.label],
    [{ platform: 'livenation', platformVenueId: 'K1' }, MODES.feed.label],
    [{ platform: 'detail-page' }, MODES.page.label],
    [{ extractionStrategy: 'manual' }, MODES.page.label],
  ] as const)('a venue with %j reads as %s', (patch, label) => {
    render(<SourceTab venue={{ ...venue, ...patch }} />);
    expect(radio(label)).toHaveProperty('checked', true);
  });

  it.each([
    [{ apiProvider: 'venuepilot', apiAccountId: '1105' }, 'VenuePilot', '1105'],
    [{ platform: 'aeg', platformVenueId: '89' }, 'AEG', '89'],
  ] as const)(
    'desktop shows a venue on a feed read-only, naming the seller and ID (%j)',
    (patch, seller, id) => {
      render(<SourceTab venue={{ ...venue, ...patch }} />);
      expect(screen.getByText(MODES.feed.subNamed(seller, id))).toBeTruthy();
      expect(radio(MODES.feed.label)).toHaveProperty('checked', true);
      expect(radio(MODES.feed.label)).toHaveProperty('disabled', true);
      expect(radio(MODES.page.label)).toHaveProperty('disabled', true);
      expect(screen.queryByTestId('source-feed-fields')).toBeNull();
      fireEvent.click(radio(MODES.page.label));
      expect(saveButton()).toBeNull();
    },
  );

  it('desktop offers no feed to a calendar-page venue', () => {
    render(<SourceTab venue={venue} />);
    expect(screen.queryByRole('radio', { name: MODES.feed.label })).toBeNull();
    expect(screen.queryAllByRole('radio', { name: /AEG|Live Nation/ })).toEqual(
      [],
    );
    expect(radio(MODES.page.label)).toHaveProperty('disabled', false);
  });

  it('phone keeps the feed editable, to and from', () => {
    phone = true;
    render(<SourceTab venue={venue} />);
    expect(radio(MODES.feed.label)).toHaveProperty('disabled', false);
    fireEvent.click(radio(MODES.feed.label));
    expect(screen.getByTestId('source-feed-fields')).toBeTruthy();
    expect(saveButton()).toBeTruthy();
    fireEvent.click(radio(MODES.page.label));
    expect(saveButton()).toBeNull();
  });

  it('draws the seller and its venue ID on phone', () => {
    phone = true;
    render(
      <SourceTab
        venue={{ ...venue, platform: 'aeg', platformVenueId: '89' }}
      />,
    );
    const fields = screen.getByTestId('source-feed-fields');
    expect(within(fields).getByRole('radio', { name: 'AEG' })).toHaveProperty(
      'checked',
      true,
    );
    const idInput = within(fields).getByLabelText(
      COPY.read.feedId.label('Gothic', 'AEG'),
    );
    expect(idInput).toHaveProperty('value', '89');
    expect(screen.getByText(COPY.read.feedId.hints.aeg)).toBeTruthy();
  });

  it('has no Don’t crawl radio, on desktop or phone', () => {
    for (const isPhone of [false, true]) {
      phone = isPhone;
      render(<SourceTab venue={venue} />);
      expect(screen.queryByRole('radio', { name: /don.t crawl/i })).toBeNull();
      cleanup();
    }
  });

  it('a stored manual reads as the calendar page, with its note', () => {
    render(<SourceTab venue={{ ...venue, extractionStrategy: 'manual' }} />);
    expect(radio(MODES.page.label)).toHaveProperty('checked', true);
    expect(screen.getByTestId('source-manual-note').textContent).toBe(
      COPY.read.manualNote,
    );
    expect(screen.getByTestId('source-rules')).toBeTruthy();
  });

  it('shows no manual note for any other venue', () => {
    render(<SourceTab venue={venue} />);
    expect(screen.queryByTestId('source-manual-note')).toBeNull();
  });

  it('saving a manual venue leaves its strategy alone', async () => {
    render(<SourceTab venue={{ ...venue, extractionStrategy: 'manual' }} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect([...sentFormData().keys()]).toEqual(['websiteUrl']);
  });

  it('saving a manual venue sends the strategy once the reader changes', async () => {
    render(<SourceTab venue={{ ...venue, extractionStrategy: 'manual' }} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.advanced.label) }),
    );
    fireEvent.click(
      screen.getByRole('radio', { name: COPY.advanced.reader.llm }),
    );
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(sentFormData().entries())).toEqual({
      extractionStrategy: 'llm',
    });
  });

  it('holds Test it now and Ask the venue out of the tab', () => {
    render(<SourceTab venue={{ ...venue, robotsTxtAllowed: false }} />);
    expect(screen.queryByRole('button', { name: /test it now/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /ask the venue/i })).toBeNull();
    expect(screen.queryByText(/debug html/i)).toBeNull();
  });
});

describe('SourceTab — the platform probe, under the feed ID', () => {
  const PROBE = COPY.read.probe;

  it('probes the typed AEG ID and shows what it found', async () => {
    phone = true;
    mockProbe.mockResolvedValue({
      success: true,
      data: {
        ok: true,
        eventsFound: 12,
        fetchLatencyMs: 250,
        sourceUrl: 'https://aegwebprod.blob.core.windows.net/json/events/89',
      },
    });
    render(
      <SourceTab
        venue={{ ...venue, platform: 'aeg', platformVenueId: '89' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: PROBE.button }));
    expect(
      (await screen.findByTestId('source-probe-result')).textContent,
    ).toContain(`12 ${PROBE.okEvents} 250ms`);
    expect(mockProbe).toHaveBeenCalledWith('venue-1', {
      platform: 'aeg',
      platformVenueId: '89',
    });
  });

  it('asks for the ID before probing without one', () => {
    phone = true;
    render(
      <SourceTab
        venue={{ ...venue, platform: 'aeg', platformVenueId: null }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: PROBE.button }));
    expect(screen.getByText(COPY.read.feedId.required('AEG'))).toBeTruthy();
    expect(mockProbe).not.toHaveBeenCalled();
  });

  it('has no probe for VenuePilot', () => {
    phone = true;
    render(
      <SourceTab
        venue={{ ...venue, apiProvider: 'venuepilot', apiAccountId: '1105' }}
      />,
    );
    expect(screen.queryByRole('button', { name: PROBE.button })).toBeNull();
  });
});

describe('SourceTab — Advanced', () => {
  it('starts collapsed, with its line', () => {
    render(<SourceTab venue={venue} />);
    const toggle = screen.getByRole('button', {
      name: new RegExp(COPY.advanced.label),
    });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText(COPY.advanced.collapsedLine)).toBeTruthy();
    expect(screen.queryByTestId('source-advanced')).toBeNull();
  });

  it('opens to page loading, wait until, wait for and the reader', () => {
    render(
      <SourceTab
        venue={{
          ...venue,
          crawlMode: 'browser',
          crawlWaitUntil: 'load',
          crawlWaitForSelector: '.event-list',
          extractionStrategy: 'llm',
        }}
      />,
    );
    const toggle = screen.getByRole('button', {
      name: new RegExp(COPY.advanced.label),
    });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const advanced = screen.getByTestId('source-advanced');
    const option = (name: string) =>
      within(advanced).getByRole('radio', { name });
    expect(option(COPY.advanced.pageLoading.browser)).toHaveProperty(
      'checked',
      true,
    );
    expect(option(COPY.advanced.waitUntil.load)).toHaveProperty(
      'checked',
      true,
    );
    expect(option(COPY.advanced.reader.llm)).toHaveProperty('checked', true);
    expect(
      within(advanced).getByLabelText(COPY.advanced.waitFor.label),
    ).toHaveProperty('value', '.event-list');
  });

  const openAdvanced = () =>
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.advanced.label) }),
    );
  const option = (name: string) => screen.getByRole('radio', { name });

  it('a detail-page venue reads as Detail pages, among the other readers', () => {
    render(<SourceTab venue={{ ...venue, platform: 'detail-page' }} />);
    openAdvanced();
    expect(option(COPY.advanced.reader['detail-page'])).toHaveProperty(
      'checked',
      true,
    );
    expect(screen.getByText(COPY.advanced.detailPage)).toBeTruthy();
    expect(option(COPY.advanced.reader.llm)).toHaveProperty('checked', false);
  });

  it('picking Detail pages sends the detail-page platform', async () => {
    render(<SourceTab venue={venue} />);
    openAdvanced();
    fireEvent.click(option(COPY.advanced.reader['detail-page']));
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(sentFormData().entries())).toEqual({
      platform: 'detail-page',
      platformVenueId: '',
    });
  });

  it('moving off Detail pages clears the platform', async () => {
    render(<SourceTab venue={{ ...venue, platform: 'detail-page' }} />);
    openAdvanced();
    fireEvent.click(readerRadio(COPY.advanced.reader.auto));
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(sentFormData().entries())).toEqual({
      platform: '',
      platformVenueId: '',
    });
  });

  it('page loading offers Automatic, and picking it sends a null crawl mode', async () => {
    render(<SourceTab venue={venue} />);
    openAdvanced();
    expect(loadingRadio(COPY.advanced.pageLoading.auto)).toHaveProperty(
      'checked',
      false,
    );
    expect(loadingRadio(COPY.advanced.pageLoading.http)).toHaveProperty(
      'checked',
      true,
    );
    fireEvent.click(loadingRadio(COPY.advanced.pageLoading.auto));
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(sentFormData().entries())).toEqual({
      crawlMode: '',
    });
  });
});

describe('SourceTab — its own save bar', () => {
  it('appears only once something changed, and Discard puts it back', () => {
    render(<SourceTab venue={venue} />);
    expect(saveButton()).toBeNull();

    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    expect(saveButton()).toBeTruthy();
    expect(
      screen.getByText(COPY.saveBar.unsaved(COPY.read.title)),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: COPY.saveBar.discard }));
    expect(saveButton()).toBeNull();
    expect(calendarInput()).toHaveProperty('value', venue.websiteUrl);
  });

  it('a radio picked and picked back is not a change', () => {
    render(<SourceTab venue={venue} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.advanced.label) }),
    );
    fireEvent.click(radio(COPY.advanced.reader.llm));
    expect(saveButton()).toBeTruthy();
    fireEvent.click(readerRadio(COPY.advanced.reader.auto));
    expect(saveButton()).toBeNull();
  });

  it('sends only Source’s changed fields', async () => {
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(mockUpdateVenue.mock.calls[0]?.[0]).toBe('venue-1');
    expect([...sentFormData().keys()]).toEqual(['websiteUrl']);
    expect(sentFormData().get('websiteUrl')).toBe(
      'https://gothic.example/calendar',
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(saveButton()).toBeNull();
  });

  it('sends a reader change alone, and never the delay or robots', async () => {
    render(<SourceTab venue={venue} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.advanced.label) }),
    );
    fireEvent.click(radio(COPY.advanced.reader.structured_data));
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    const keys = [...sentFormData().keys()];
    expect(keys).toEqual(['extractionStrategy']);
    expect(sentFormData().get('extractionStrategy')).toBe('structured_data');
    expect(keys).not.toContain('crawlDelayMs');
    expect(keys).not.toContain('robotsTxtAllowed');
  });

  it('sends a phone switch to a feed as the seller’s pairs', async () => {
    phone = true;
    render(<SourceTab venue={venue} />);
    fireEvent.click(radio(MODES.feed.label));
    fireEvent.click(screen.getByRole('radio', { name: 'Live Nation' }));
    fireEvent.change(
      screen.getByLabelText(COPY.read.feedId.label('Gothic', 'Live Nation')),
      { target: { value: 'KovZpZAE6eJA' } },
    );
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    const sent = Object.fromEntries(sentFormData().entries());
    expect(sent).toEqual({
      platform: 'livenation',
      platformVenueId: 'KovZpZAE6eJA',
    });
  });

  it.each(['javascript:alert(1)', 'ftp://gothic.example/events'])(
    'refuses a calendar page of %s before any request',
    async (value) => {
      render(<SourceTab venue={venue} />);
      fireEvent.change(calendarInput(), { target: { value } });
      clickSave();
      expect(
        await screen.findByText(COPY.read.calendarPage.invalid),
      ).toBeTruthy();
      expect(calendarInput().getAttribute('aria-invalid')).toBe('true');
      expect(mockUpdateVenue).not.toHaveBeenCalled();
    },
  );

  it('a failed save snaps back and shows the toast, with Try again', async () => {
    mockUpdateVenue.mockResolvedValueOnce({ success: false, error: 'boom' });
    render(<SourceTab venue={venue} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.advanced.label) }),
    );
    fireEvent.click(radio(COPY.advanced.reader.llm));
    clickSave();

    const toast = await screen.findByTestId('save-failed');
    expect(toast.textContent).toContain(COPY.failed.title);
    expect(toast.textContent).toContain(COPY.failed.saved.page);
    // Snapped back to what is saved: the bar is gone.
    expect(readerRadio(COPY.advanced.reader.auto)).toHaveProperty(
      'checked',
      true,
    );
    expect(saveButton()).toBeNull();

    fireEvent.click(within(toast).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(2));
    expect(mockUpdateVenue.mock.calls[1]?.[1].get('extractionStrategy')).toBe(
      'llm',
    );
  });

  it('a thrown save snaps back and shows the toast', async () => {
    mockUpdateVenue.mockRejectedValueOnce(new Error('network'));
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    expect(await screen.findByTestId('save-failed')).toBeTruthy();
    expect(calendarInput()).toHaveProperty('value', venue.websiteUrl);
  });

  it('a refusal that names an input marks it and keeps the edit', async () => {
    mockUpdateVenue.mockResolvedValueOnce({
      success: false,
      field: 'crawlWaitForSelector',
      error: 'crawlWaitForSelector is required for browser-mode venues',
    });
    render(<SourceTab venue={venue} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.advanced.label) }),
    );
    fireEvent.click(
      screen.getByRole('radio', { name: COPY.advanced.pageLoading.browser }),
    );
    clickSave();
    expect(
      await screen.findByText(
        'crawlWaitForSelector is required for browser-mode venues',
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: COPY.advanced.pageLoading.browser }),
    ).toHaveProperty('checked', true);
    const toast = screen.getByTestId('save-failed');
    expect(
      within(toast).queryByRole('button', { name: 'Try again' }),
    ).toBeNull();
  });
});

describe('SourceTab — robots.txt', () => {
  it('allowed: the verdict, when it was checked, and our agent', () => {
    render(<SourceTab venue={venue} />);
    const card = screen.getByTestId('source-robots');
    expect(within(card).getByText(COPY.robots.allowed)).toBeTruthy();
    expect(within(card).getByText('Nov 11 · 3:00 AM')).toBeTruthy();
    expect(within(card).getByText('ConcertCrawl/1.0')).toBeTruthy();
    expect(within(card).getByText(COPY.robots.footnote)).toBeTruthy();
  });

  it('disallowed: the warning verdict and footnote, no rule or since-date', () => {
    render(<SourceTab venue={{ ...venue, robotsTxtAllowed: false }} />);
    const card = screen.getByTestId('source-robots');
    expect(within(card).getByText(COPY.robots.disallowed)).toBeTruthy();
    expect(within(card).getByText(COPY.robots.disallowedFootnote)).toBeTruthy();
    expect(within(card).queryByText(/since/i)).toBeNull();
    expect(within(card).queryByText(/the rule/i)).toBeNull();
  });

  it('never checked: says so', () => {
    render(
      <SourceTab
        venue={{ ...venue, robotsTxtAllowed: null, robotsTxtCheckedAt: null }}
      />,
    );
    const card = screen.getByTestId('source-robots');
    expect(within(card).getByText(COPY.robots.unchecked)).toBeTruthy();
    expect(within(card).getByText(COPY.robots.never)).toBeTruthy();
  });

  it('is read-only', () => {
    render(<SourceTab venue={venue} />);
    const card = screen.getByTestId('source-robots');
    expect(
      card.querySelectorAll('input, select, textarea, button'),
    ).toHaveLength(0);
  });
});

describe('SourceTab — Fixed by the crawl rules', () => {
  it('shows pace, schedule and auto-pause, read-only', () => {
    render(<SourceTab venue={venue} />);
    const card = screen.getByTestId('source-rules');
    expect(within(card).getByText(COPY.rules.paceValue('3'))).toBeTruthy();
    expect(within(card).getByText(COPY.rules.scheduleValue)).toBeTruthy();
    expect(within(card).getByText(COPY.rules.autoPauseValue)).toBeTruthy();
    expect(within(card).getByText(COPY.rules.footnote)).toBeTruthy();
    expect(
      card.querySelectorAll('input, select, textarea, button'),
    ).toHaveLength(0);
  });

  it('shows a venue’s higher stored delay', () => {
    render(<SourceTab venue={{ ...venue, crawlDelayMs: 10000 }} />);
    expect(screen.getByText(COPY.rules.paceValue('10'))).toBeTruthy();
  });
});
