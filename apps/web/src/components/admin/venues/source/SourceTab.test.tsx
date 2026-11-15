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

  it('names in the feed subtitle exactly the sellers it offers', () => {
    phone = true;
    render(<SourceTab venue={venue} />);
    expect(
      screen.getByText('VenuePilot, AEG or Live Nation. Fastest, no LLM cost.'),
    ).toBeTruthy();
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

  it('a manual venue shows its reader read-only, with no picks', () => {
    render(<SourceTab venue={{ ...venue, extractionStrategy: 'manual' }} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.advanced.label) }),
    );
    expect(
      screen.getByRole('group', { name: COPY.advanced.reader.label })
        .textContent,
    ).toBe('Manual entry');
    expect(screen.getByText('Set to manual entry.')).toBeTruthy();
    expect(
      screen.queryByRole('radiogroup', { name: COPY.advanced.reader.label }),
    ).toBeNull();
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
    expect((await screen.findByTestId('source-probe-result')).textContent).toBe(
      PROBE.ok(
        12,
        250,
        'https://aegwebprod.blob.core.windows.net/json/events/89',
      ),
    );
    expect(mockProbe).toHaveBeenCalledWith('venue-1', {
      platform: 'aeg',
      platformVenueId: '89',
    });
  });

  it('drops an answer that arrives after the seller changed', async () => {
    phone = true;
    let answer: (value: unknown) => void = () => undefined;
    mockProbe.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    render(
      <SourceTab
        venue={{ ...venue, platform: 'aeg', platformVenueId: '89' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: PROBE.button }));
    fireEvent.click(screen.getByRole('radio', { name: 'Live Nation' }));
    fireEvent.click(screen.getByRole('radio', { name: 'AEG' }));
    answer({
      success: true,
      data: { ok: true, eventsFound: 3, fetchLatencyMs: 9, sourceUrl: 'x' },
    });
    // A second, unanswered probe would be needed to show anything now.
    await waitFor(() => expect(mockProbe).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('source-probe-result')).toBeNull();
  });

  it('keeps the saved ID when the saved seller is picked again', () => {
    phone = true;
    render(
      <SourceTab
        venue={{ ...venue, platform: 'aeg', platformVenueId: '89' }}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Live Nation' }));
    fireEvent.click(screen.getByRole('radio', { name: 'AEG' }));
    expect(saveButton()).toBeNull();
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
    render(<SourceTab venue={{ ...venue, crawlMode: null }} />);
    const toggle = screen.getByRole('button', {
      name: new RegExp(COPY.advanced.label),
    });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByText(COPY.advanced.collapsedLine)).toBeTruthy();
    expect(screen.queryByTestId('source-advanced')).toBeNull();
  });

  it('the collapsed line says all automatic, and never promises debug HTML', () => {
    render(<SourceTab venue={{ ...venue, crawlMode: null }} />);
    expect(
      screen.getByText(
        'All automatic. Page loading, wait-for selector, reader.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/debug html/i)).toBeNull();
    expect(screen.queryByTestId('source-advanced-forced')).toBeNull();
    expect(
      screen.queryByRole('button', { name: COPY.advanced.backToAutomatic }),
    ).toBeNull();
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
    expect(
      screen.getByText(COPY.advanced.reader.hints['detail-page']),
    ).toBeTruthy();
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

  it('page loading offers Automatic, selected for a venue with no stored mode', async () => {
    render(<SourceTab venue={{ ...venue, crawlMode: null }} />);
    openAdvanced();
    const group = within(
      screen.getByRole('radiogroup', { name: COPY.advanced.pageLoading.label }),
    );
    expect(
      group.getAllByRole('radio').map((input) => input.getAttribute('value')),
    ).toEqual(['auto', 'http', 'browser']);
    expect(loadingRadio(COPY.advanced.pageLoading.auto)).toHaveProperty(
      'checked',
      true,
    );
    expect(saveButton()).toBeNull();
    fireEvent.click(loadingRadio(COPY.advanced.pageLoading.browser));
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(sentFormData().entries())).toEqual({
      crawlMode: 'browser',
    });
  });

  it('switching back to Automatic sends a null crawl mode', async () => {
    render(<SourceTab venue={venue} />);
    openAdvanced();
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

describe('SourceTab — Advanced, Automatic and set by hand (item 18)', () => {
  const toggle = () =>
    screen.getByRole('button', { name: new RegExp(COPY.advanced.label) });
  const backButton = () =>
    screen.queryByRole('button', { name: COPY.advanced.backToAutomatic });
  const chips = () =>
    Array.from(
      screen.getByTestId('source-advanced-forced').children,
      (chip) => chip.textContent,
    );
  const forced: SourceVenue = {
    ...venue,
    crawlMode: 'browser',
    extractionStrategy: 'llm',
    crawlWaitUntil: 'load',
    crawlWaitForSelector: '.event-list',
  };

  it('closed, chips a forced Reader, with Back to Automatic (18/source-forced-d)', () => {
    render(<SourceTab venue={forced} />);
    expect(within(toggle()).getByText(COPY.advanced.setByHand)).toBeTruthy();
    expect(screen.queryByText(COPY.advanced.collapsedLine)).toBeNull();
    // Page loading is never a chip: the crawler stores crawl_mode itself.
    // Wait for is a hand pick, so it is one.
    expect(chips()).toEqual(['Reader: Haiku only', 'Wait for: .event-list']);
    expect(backButton()).toBeTruthy();
  });

  it('closed chips are a group named by Advanced', () => {
    render(<SourceTab venue={forced} />);
    const group = screen.getByRole('group', { name: COPY.advanced.label });
    expect(group).toBe(screen.getByTestId('source-advanced-forced'));
  });

  it('a Wait for selector alone is set by hand, with no Back to Automatic', () => {
    render(
      <SourceTab
        venue={{ ...venue, crawlMode: null, crawlWaitForSelector: '.ev' }}
      />,
    );
    expect(screen.queryByText(COPY.advanced.collapsedLine)).toBeNull();
    expect(within(toggle()).getByText(COPY.advanced.setByHand)).toBeTruthy();
    expect(chips()).toEqual([COPY.advanced.forced.waitFor('.ev')]);
    expect(backButton()).toBeNull();
  });

  it.each(['browser', 'http'] as const)(
    'a stored crawlMode %s alone reads as all automatic, with nothing to clear',
    (crawlMode) => {
      render(<SourceTab venue={{ ...venue, crawlMode }} />);
      expect(screen.getByText(COPY.advanced.collapsedLine)).toBeTruthy();
      expect(screen.queryByText(COPY.advanced.setByHand)).toBeNull();
      expect(screen.queryByTestId('source-advanced-forced')).toBeNull();
      expect(backButton()).toBeNull();
      expect(screen.queryByText(/unsaved change/)).toBeNull();
    },
  );

  it('Back to Automatic is an unsaved change, then Save clears only the reader (18/source-advanced-states)', async () => {
    render(<SourceTab venue={forced} />);
    const backToAutomatic = backButton();
    if (backToAutomatic === null) throw new Error('Expected Back to Automatic');
    fireEvent.click(backToAutomatic);
    // Wait for is left alone, so it is still set by hand.
    expect(screen.queryByText(COPY.advanced.collapsedLine)).toBeNull();
    expect(within(toggle()).getByText(COPY.advanced.setByHand)).toBeTruthy();
    expect(chips()).toEqual(['Wait for: .event-list']);
    expect(backButton()).toBeNull();
    expect(screen.getByText('1 unsaved change')).toBeTruthy();
    expect(document.activeElement).toBe(toggle());
    expect(mockUpdateVenue).not.toHaveBeenCalled();
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    // Page loading, Wait until and Wait for are left as they are.
    const sent = Object.fromEntries(sentFormData().entries());
    expect(sent).toEqual({ extractionStrategy: '' });
    expect(sent).not.toHaveProperty('crawlMode');
  });

  it('after Back to Automatic on JSON-LD only, one unsaved change', () => {
    render(
      <SourceTab
        venue={{
          ...venue,
          crawlMode: null,
          extractionStrategy: 'structured_data',
        }}
      />,
    );
    expect(chips()).toEqual(['Reader: JSON-LD only']);
    fireEvent.click(screen.getByText(COPY.advanced.backToAutomatic));
    expect(screen.getByText('1 unsaved change')).toBeTruthy();
  });

  it('Back to Automatic on Detail pages clears the platform', async () => {
    render(
      <SourceTab
        venue={{ ...venue, crawlMode: null, platform: 'detail-page' }}
      />,
    );
    expect(chips()).toEqual(['Reader: Detail pages']);
    fireEvent.click(screen.getByText(COPY.advanced.backToAutomatic));
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(sentFormData().entries())).toEqual({
      platform: '',
      platformVenueId: '',
    });
  });

  it('Back to Automatic on a manual venue on Detail pages keeps its manual', async () => {
    render(
      <SourceTab
        venue={{
          ...venue,
          crawlMode: null,
          platform: 'detail-page',
          extractionStrategy: 'manual',
        }}
      />,
    );
    fireEvent.click(screen.getByText(COPY.advanced.backToAutomatic));
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    // Regression: never extractionStrategy, which would wipe the manual.
    expect(Object.fromEntries(sentFormData().entries())).toEqual({
      platform: '',
      platformVenueId: '',
    });
  });

  it.each([
    [{ platform: 'aeg', platformVenueId: '89' }, 'AEG'],
    [{ platform: 'livenation', platformVenueId: 'K1' }, 'Live Nation'],
  ] as const)(
    'a %j feed shows its reader as a read-only chip, with no Back to Automatic',
    (patch, seller) => {
      render(
        <SourceTab venue={{ ...venue, ...patch, crawlMode: 'browser' }} />,
      );
      expect(chips()).toEqual([`Reader: ${seller}`]);
      expect(backButton()).toBeNull();
      fireEvent.click(toggle());
      const locked = screen.getByRole('group', {
        name: COPY.advanced.reader.label,
      });
      expect(locked.textContent).toBe(seller);
      expect(screen.getByTestId('source-reader-locked').textContent).toBe(
        seller,
      );
      expect(screen.getByText(`Set by the ${seller} feed.`)).toBeTruthy();
      expect(
        screen.queryByRole('radiogroup', { name: COPY.advanced.reader.label }),
      ).toBeNull();
    },
  );

  it('a feed alone offers no Back to Automatic', () => {
    render(
      <SourceTab
        venue={{
          ...venue,
          crawlMode: null,
          platform: 'aeg',
          platformVenueId: '89',
        }}
      />,
    );
    expect(chips()).toEqual(['Reader: AEG']);
    expect(backButton()).toBeNull();
    // A lock is not set by hand, and not all automatic either.
    expect(screen.queryByText(COPY.advanced.setByHand)).toBeNull();
    expect(screen.queryByText(COPY.advanced.collapsedLine)).toBeNull();
    const chip = screen.getByText('Reader: AEG');
    expect(chip.getAttribute('data-kind')).toBe('lock');
    expect(chip.style.color).not.toContain('--warning');
  });

  it('a manual venue chips its reader as Manual entry, not set by hand', () => {
    render(
      <SourceTab
        venue={{ ...venue, crawlMode: null, extractionStrategy: 'manual' }}
      />,
    );
    expect(chips()).toEqual(['Reader: Manual entry']);
    expect(backButton()).toBeNull();
    expect(screen.queryByText(COPY.advanced.setByHand)).toBeNull();
    expect(screen.getByText('Reader: Manual entry').style.color).not.toContain(
      '--warning',
    );
  });

  it('a feed with a Wait for selector is set by hand for the selector only', () => {
    render(
      <SourceTab
        venue={{
          ...venue,
          crawlMode: null,
          platform: 'aeg',
          platformVenueId: '89',
          crawlWaitForSelector: '.ev',
        }}
      />,
    );
    expect(within(toggle()).getByText(COPY.advanced.setByHand)).toBeTruthy();
    expect(chips()).toEqual(['Reader: AEG', 'Wait for: .ev']);
    expect(screen.getByText('Wait for: .ev').getAttribute('data-kind')).toBe(
      'forced',
    );
    expect(backButton()).toBeNull();
  });

  it('VenuePilot has no reader row', () => {
    render(
      <SourceTab
        venue={{ ...venue, apiProvider: 'venuepilot', apiAccountId: '1105' }}
      />,
    );
    fireEvent.click(toggle());
    expect(
      within(screen.getByTestId('source-advanced')).queryByText(
        COPY.advanced.reader.label,
      ),
    ).toBeNull();
  });

  it('desktop opens Advanced as its own card, two by two, with Back to Automatic and Hide (18/source-advanced-d)', () => {
    render(<SourceTab venue={forced} />);
    fireEvent.click(toggle());
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(within(toggle()).getByText(COPY.advanced.openBelow)).toBeTruthy();
    const card = screen.getByTestId('source-advanced-card');
    // Under the two columns, not inside How we read it.
    expect(
      within(screen.getByTestId('source-read')).queryByTestId(
        'source-advanced',
      ),
    ).toBeNull();
    expect(toggle().getAttribute('aria-controls')).toBe(card.id);
    expect(
      within(card).getByRole('heading', { name: COPY.advanced.label }),
    ).toBeTruthy();
    const controls = within(card).getByTestId('source-advanced');
    expect(controls.style.display).toBe('grid');
    expect(controls.style.gap).toBe('20px 28px');
    expect(
      Array.from(
        controls.children,
        (cell) => cell.firstElementChild?.textContent,
      ),
    ).toEqual([
      COPY.advanced.pageLoading.label,
      COPY.advanced.reader.label,
      COPY.advanced.waitUntil.label,
      COPY.advanced.waitFor.label,
    ]);
    expect(
      within(card).getByText(COPY.advanced.pageLoading.hints.browser),
    ).toBeTruthy();
    expect(within(card).getByText(COPY.advanced.reader.hints.llm)).toBeTruthy();
    // Desktop's reader is the segmented control.
    expect(
      within(card)
        .getAllByRole('radio')
        .filter((input) => input.getAttribute('name')?.endsWith('-reader'))
        .map((input) => input.getAttribute('value')),
    ).toEqual(['auto', 'structured_data', 'llm', 'detail-page']);

    fireEvent.click(
      within(card).getByRole('button', {
        name: COPY.advanced.backToAutomatic,
      }),
    );
    // Page loading keeps its stored value; only the reader goes back.
    expect(
      within(card).getByText(COPY.advanced.pageLoading.hints.browser),
    ).toBeTruthy();
    expect(
      within(card).getByText(COPY.advanced.reader.hints.auto),
    ).toBeTruthy();
    expect(
      within(card).queryByRole('button', {
        name: COPY.advanced.backToAutomatic,
      }),
    ).toBeNull();

    fireEvent.click(
      within(card).getByRole('button', { name: COPY.advanced.hide }),
    );
    expect(screen.queryByTestId('source-advanced-card')).toBeNull();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(toggle());
  });

  it('the phone stacks the controls in How we read it, and wraps Reader as chips (18/source-advanced-m)', () => {
    phone = true;
    render(
      <SourceTab
        venue={{ ...venue, crawlMode: null, platform: 'detail-page' }}
      />,
    );
    fireEvent.click(toggle());
    expect(screen.queryByTestId('source-advanced-card')).toBeNull();
    const controls = within(screen.getByTestId('source-read')).getByTestId(
      'source-advanced',
    );
    expect(controls.style.display).toBe('flex');
    expect(
      Array.from(
        controls.children,
        (cell) => cell.firstElementChild?.textContent,
      ),
    ).toEqual([
      COPY.advanced.pageLoading.label,
      COPY.advanced.reader.label,
      COPY.advanced.waitUntil.label,
      COPY.advanced.waitFor.label,
    ]);
    // Chips are pills (radius 999), not segments.
    const detail = readerRadio(COPY.advanced.reader['detail-page']);
    expect(detail).toHaveProperty('checked', true);
    expect(detail.closest('label')?.style.borderRadius).toBe('999px');
    expect(screen.getByText(COPY.advanced.pageLoading.hints.auto)).toBeTruthy();
    expect(
      screen.getByText(COPY.advanced.reader.hints['detail-page']),
    ).toBeTruthy();
    expect(screen.queryByText(COPY.advanced.openBelow)).toBeNull();
  });
});

describe('SourceTab — a newer server row', () => {
  it('a clean draft follows the new row', () => {
    const { rerender } = render(<SourceTab venue={venue} />);
    rerender(
      <SourceTab
        venue={{ ...venue, websiteUrl: 'https://gothic.example/new' }}
      />,
    );
    expect(calendarInput()).toHaveProperty(
      'value',
      'https://gothic.example/new',
    );
    expect(saveButton()).toBeNull();
  });

  it('keeps only the edited field, and never sends the old value back', async () => {
    const { rerender } = render(<SourceTab venue={venue} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(COPY.advanced.label) }),
    );
    fireEvent.click(radio(COPY.advanced.reader.llm));
    // Another tab changes the calendar page meanwhile.
    rerender(
      <SourceTab
        venue={{ ...venue, websiteUrl: 'https://gothic.example/new' }}
      />,
    );
    expect(calendarInput()).toHaveProperty(
      'value',
      'https://gothic.example/new',
    );
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    const sent = sentFormData();
    expect(sent.get('extractionStrategy')).toBe('llm');
    expect(sent.has('websiteUrl')).toBe(false);
  });
});

describe('SourceTab — its own save bar', () => {
  it('leads the failure toast with the API’s reason', async () => {
    mockUpdateVenue.mockResolvedValue({
      success: false,
      error: 'This venue was removed.',
    });
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    // The toast's body wraps the line ("… Nothing changed."), so match a part.
    expect(
      await screen.findByText((text) =>
        text.startsWith(`This venue was removed. ${COPY.failed.saved.page}`),
      ),
    ).toBeTruthy();
  });

  it('opens Advanced to show a refused Wait for', async () => {
    mockUpdateVenue.mockResolvedValue({
      success: false,
      error: 'Full browser needs a selector.',
      field: 'crawlWaitForSelector',
    });
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    await waitFor(() => expect(mockUpdateVenue).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('source-advanced')).toBeTruthy();
    expect(
      screen.getAllByText('Full browser needs a selector.', { exact: false })
        .length,
    ).toBeGreaterThan(0);
  });

  it('appears only once something changed, and Discard puts it back', () => {
    render(<SourceTab venue={venue} />);
    expect(saveButton()).toBeNull();

    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    expect(saveButton()).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: COPY.saveBar.discard }));
    expect(saveButton()).toBeNull();
    expect(calendarInput()).toHaveProperty('value', venue.websiteUrl);
  });

  // Style contract only (jsdom has no layout): Source's look on the shared
  // PinnedSaveBar, which differs from Details' on purpose.
  // The phone keeps the pinned two-row bar (`G4/source-feed-edited`).
  it('draws the phone Save bar pinned, in Source’s look', () => {
    phone = true;
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    expect(screen.queryByTestId('source-save-row')).toBeNull();
    const bar = screen.getByTestId('source-save-bar');
    expect(bar.style.position).toBe('sticky');
    expect(bar.style.gap).toBe('8px');
    expect(bar.style.flexWrap).toBe('');
    expect(bar.style.flexDirection).toBe('column');
    expect(bar.style.padding).toBe('10px 16px 24px');
    expect(
      screen.getByText(COPY.saveBar.unsaved(COPY.read.title)).style.color,
    ).toBe('var(--fg-muted)');
    const save = screen.getByRole('button', { name: COPY.saveBar.save });
    const discard = screen.getByRole('button', { name: COPY.saveBar.discard });
    expect(save.style.flexGrow).toBe('1');
    expect(save.style.height).toBe('44px');
    expect(discard.style.height).toBe('44px');
    // The buttons share a row under the message.
    expect(save.parentElement === bar).toBe(false);
  });

  // `04/venue-source`: an inline row under the cards, right-aligned, gap 8;
  // borderless Discard 36/13, gradient Save 36/13.5, radius 9.
  it('draws desktop’s Discard and Save as an inline right-aligned row', () => {
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    expect(screen.queryByTestId('source-save-bar')).toBeNull();
    expect(
      screen.queryByText(COPY.saveBar.unsaved(COPY.read.title)),
    ).toBeNull();
    const row = screen.getByTestId('source-save-row');
    expect(row.style.position).not.toBe('sticky');
    expect(row.style.justifyContent).toBe('flex-end');
    expect(row.style.gap).toBe('8px');
    const discard = within(row).getByRole('button', {
      name: COPY.saveBar.discard,
    });
    const styleOf = (el: HTMLElement) => ({
      height: el.style.height,
      fontSize: el.style.fontSize,
      borderRadius: el.style.borderRadius,
      padding: el.style.padding,
      background: el.style.background,
      border: el.style.border,
    });
    expect(styleOf(discard)).toEqual({
      height: '36px',
      fontSize: '13px',
      borderRadius: '9px',
      padding: '0px 12px',
      background: 'transparent',
      border: '1px solid transparent',
    });
    const save = within(row).getByRole('button', { name: COPY.saveBar.save });
    expect(styleOf(save)).toMatchObject({
      height: '36px',
      fontSize: '13.5px',
      borderRadius: '9px',
      padding: '0px 16px',
    });
  });

  it('floats a failed save’s toast over desktop’s row while the edit stays', async () => {
    mockUpdateVenue.mockResolvedValue({
      success: false,
      error: 'Full browser needs a selector.',
      field: 'crawlWaitForSelector',
    });
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    const toast = await screen.findByTestId('save-failed');
    expect(screen.getByTestId('source-save-row').contains(toast)).toBe(true);
  });

  it('a desktop save hands focus to the Source heading as the row goes', async () => {
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    screen.getByRole('button', { name: COPY.saveBar.save }).focus();
    clickSave();
    await waitFor(() =>
      expect(screen.queryByTestId('source-save-row')).toBeNull(),
    );
    const heading = screen.getByRole('heading', { name: COPY.read.title });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(heading.getAttribute('tabindex')).toBe('-1');
  });

  it('a phone save hands focus to the Source heading as the pinned bar goes', async () => {
    phone = true;
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    await waitFor(() =>
      expect(screen.queryByTestId('source-save-bar')).toBeNull(),
    );
    const heading = screen.getByRole('heading', { name: COPY.read.title });
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('a failed phone save hands focus to its toast', async () => {
    phone = true;
    mockUpdateVenue.mockRejectedValueOnce(new Error('network'));
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    const toast = await screen.findByTestId('save-failed');
    expect(screen.queryByTestId('source-save-bar')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(toast));
  });

  it('focuses the heading without scrolling', async () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    const heading = screen.getByRole('heading', { name: COPY.read.title });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    const call = focus.mock.contexts.findIndex((ctx) => ctx === heading);
    expect(focus.mock.calls[call]?.[0]).toEqual({ preventScroll: true });
    focus.mockRestore();
  });

  it('a failed desktop save hands focus to its toast', async () => {
    mockUpdateVenue.mockRejectedValueOnce(new Error('network'));
    render(<SourceTab venue={venue} />);
    fireEvent.change(calendarInput(), {
      target: { value: 'https://gothic.example/calendar' },
    });
    clickSave();
    const toast = await screen.findByTestId('save-failed');
    expect(screen.queryByTestId('source-save-row')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(toast));
    expect(toast.getAttribute('tabindex')).toBe('-1');
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
    // No ", before the run": the check is stamped as the run ends.
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
    // The cron's 09:07Z: 2:07 AM in November (MST).
    render(
      <SourceTab
        venue={{ ...venue, nextCrawlAt: '2026-11-14T09:07:00.000Z' }}
      />,
    );
    const card = screen.getByTestId('source-rules');
    expect(within(card).getByText(COPY.rules.paceValue('3'))).toBeTruthy();
    expect(within(card).getByText('Daily, 2:07 AM MT')).toBeTruthy();
    expect(within(card).getByText(COPY.rules.autoPauseValue)).toBeTruthy();
    expect(within(card).getByText(COPY.rules.footnote)).toBeTruthy();
    expect(
      card.querySelectorAll('input, select, textarea, button'),
    ).toHaveLength(0);
  });

  it('follows daylight time: 09:07Z in July is 3:07 AM', () => {
    render(
      <SourceTab
        venue={{ ...venue, nextCrawlAt: '2026-07-14T09:07:00.000Z' }}
      />,
    );
    expect(screen.getByText('Daily, 3:07 AM MT')).toBeTruthy();
  });

  it.each([null, undefined])(
    'drops the Schedule row when there is no daily crawl to name (%s)',
    (nextCrawlAt) => {
      render(
        <SourceTab
          venue={{
            ...venue,
            ...(nextCrawlAt === undefined ? {} : { nextCrawlAt }),
          }}
        />,
      );
      const card = screen.getByTestId('source-rules');
      expect(within(card).queryByText(COPY.rules.schedule)).toBeNull();
      expect(within(card).queryByText(/Daily/)).toBeNull();
      expect(within(card).getByText(COPY.rules.autoPauseValue)).toBeTruthy();
    },
  );

  it('shows a venue’s higher stored delay', () => {
    render(<SourceTab venue={{ ...venue, crawlDelayMs: 10000 }} />);
    expect(screen.getByText(COPY.rules.paceValue('10'))).toBeTruthy();
  });
});
