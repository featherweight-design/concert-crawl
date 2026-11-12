// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { VenuesList } from './VenuesList';
import type { VenueListRow } from './venue-list-rules';

const COPY = ADMIN_COPY.venuesList;
const BULK = COPY.bulk;

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const { pauseCrawling, recrawlVenue } = vi.hoisted(() => ({
  pauseCrawling: vi.fn(),
  recrawlVenue: vi.fn(),
}));
vi.mock('@/lib/actions/venues', () => ({ pauseCrawling, recrawlVenue }));
vi.mock('@/components/admin/AddVenueModal', () => ({
  AddVenueModal: () => null,
}));

const venue = (name: string, over: Partial<VenueListRow> = {}): VenueListRow =>
  ({
    id: name,
    name,
    slug: name.toLowerCase(),
    active: true,
    crawlPausedAt: null,
    blockedAt: null,
    consecutiveFailures: 0,
    robotsTxtAllowed: true,
    removedAt: null,
    neighborhood: null,
    eventCount: 1,
    lastRunStatus: 'success',
    latestRun: null,
    ...over,
  }) as VenueListRow; // fixture: the list reads only these fields

const twelveOk = Array.from({ length: 12 }, (_, i) =>
  venue(`Venue ${String(i).padStart(2, '0')}`),
);

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});
afterEach(cleanup);

describe('VenuesList', () => {
  it('folds OK venues past ten and expands them in place', () => {
    render(<VenuesList venues={twelveOk} />);
    expect(screen.getAllByTestId('venue-row')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: '2 more, all OK' }));
    expect(screen.getAllByTestId('venue-row')).toHaveLength(12);
  });

  it('shows the filter-empty state when a search matches nothing', () => {
    render(<VenuesList venues={twelveOk} />);
    fireEvent.change(screen.getByLabelText('Search venues'), {
      target: { value: 'nothing like it' },
    });
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it("says Couldn't load and retries", () => {
    render(<VenuesList venues={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalled();
  });
});

describe('VenuesList Select', () => {
  const PAUSED = '2026-10-28T15:00:00Z';
  const mixed = [
    venue('Bluebird', { verified: true }),
    venue('Globe Hall', { verified: true }),
    venue('Levitt', { verified: true, crawlPausedAt: PAUSED }),
    venue('Junkyard', {
      verified: true,
      crawlPausedAt: PAUSED,
      consecutiveFailures: 3,
    }),
    venue('Blocked', { verified: true, blockedAt: PAUSED }),
  ];
  const check = (name: string) =>
    fireEvent.click(screen.getByLabelText(COPY.selectVenue(name)));

  beforeEach(() => {
    pauseCrawling.mockReset();
    recrawlVenue.mockReset();
  });

  it('turns Select into Done, adds checkboxes and the bar', () => {
    render(<VenuesList venues={mixed} />);
    expect(screen.queryByTestId('select-bar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));

    expect(screen.getByRole('button', { name: COPY.done })).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(mixed.length + 1);
    check('Bluebird');
    check('Globe Hall');
    const bar = within(screen.getByTestId('select-bar'));
    expect(bar.getByText(BULK.selected(2))).toBeInTheDocument();
    expect(bar.getByRole('button', { name: BULK.recrawl(2) })).toBeEnabled();
    expect(bar.getByRole('button', { name: BULK.pause(2) })).toBeEnabled();

    fireEvent.click(bar.getByRole('button', { name: BULK.clear }));
    expect(bar.getByText(BULK.selected(0))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: COPY.done }));
    expect(screen.queryByTestId('select-bar')).toBeNull();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('leaves paused and auto-paused venues out of Re-crawl, and says why', () => {
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Levitt');
    check('Junkyard');
    const bar = within(screen.getByTestId('select-bar'));
    expect(bar.getByRole('button', { name: BULK.recrawl(0) })).toBeDisabled();
    expect(bar.getByText(BULK.recrawlPaused)).toBeInTheDocument();
    // Neither is being crawled, so Pause has nothing to pause either.
    expect(bar.getByRole('button', { name: BULK.pause(0) })).toBeDisabled();
    expect(bar.getByText(BULK.pauseSkipped(2))).toBeInTheDocument();

    check('Bluebird');
    expect(bar.getByRole('button', { name: BULK.recrawl(1) })).toBeEnabled();
  });

  it('gives a plain count, not the paused reason, when a blocked venue is left out', () => {
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Levitt');
    check('Blocked');
    const bar = within(screen.getByTestId('select-bar'));
    expect(bar.queryByText(BULK.recrawlPaused)).toBeNull();
    expect(bar.getByText(BULK.recrawlSkipped(2))).toBeInTheDocument();
  });

  it('pauses only the venues being crawled out of a mixed selection', async () => {
    pauseCrawling.mockResolvedValue({ ok: true });
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Levitt');
    check('Junkyard');
    const bar = within(screen.getByTestId('select-bar'));
    expect(bar.getByText(BULK.pauseSkipped(2))).toBeInTheDocument();
    fireEvent.click(bar.getByRole('button', { name: BULK.pause(1) }));
    expect(
      screen.getByText(ADMIN_COPY.pausePanel.title('Bluebird')),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.pausePanel.submit }),
    );
    await waitFor(() => expect(pauseCrawling).toHaveBeenCalledTimes(1));
    expect(pauseCrawling).toHaveBeenCalledWith('Bluebird', {
      reason: 'waiting_on_permission',
      resume: { mode: 'manual' },
    });
  });

  it('sends a mixed 422-and-error failure to the toast, not the panel', async () => {
    pauseCrawling.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'Bluebird'
          ? { ok: false, error: 'Pick a date after today' }
          : { ok: false, error: null },
      ),
    );
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Globe Hall');
    fireEvent.click(screen.getByRole('button', { name: BULK.pause(2) }));
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.pausePanel.submit }),
    );
    const toast = await screen.findByTestId('save-failed');
    expect(toast).toHaveTextContent(
      'Pick a date after today. Crawling is as it was. Nothing changed.',
    );
    expect(screen.queryByText(ADMIN_COPY.pausePanel.titleMany(2))).toBeNull();
  });

  it('tries again only on failed venues still in view, and names the rest', async () => {
    pauseCrawling.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'Bluebird' ? { ok: true } : { ok: false, error: null },
      ),
    );
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Globe Hall');
    fireEvent.click(screen.getByRole('button', { name: BULK.pause(2) }));
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.pausePanel.submit }),
    );
    const toast = await screen.findByTestId('save-failed');
    expect(pauseCrawling).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByLabelText(COPY.search), {
      target: { value: 'blue' },
    });
    fireEvent.click(within(toast).getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(screen.getByTestId('save-failed')).toHaveTextContent(
        BULK.notRetried('Globe Hall'),
      ),
    );
    expect(pauseCrawling).toHaveBeenCalledTimes(2);
  });

  it('pauses each venue and names the ones that failed, which stay selected', async () => {
    pauseCrawling.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'Globe Hall' ? { ok: false, error: null } : { ok: true },
      ),
    );
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Globe Hall');
    fireEvent.click(screen.getByRole('button', { name: BULK.pause(2) }));
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.pausePanel.submit }),
    );

    const toast = await screen.findByTestId('save-failed');
    expect(pauseCrawling).toHaveBeenCalledTimes(2);
    expect(pauseCrawling).toHaveBeenCalledWith('Bluebird', {
      reason: 'waiting_on_permission',
      resume: { mode: 'manual' },
    });
    expect(toast).toHaveTextContent(
      `Couldn't change ${BULK.pauseFailed('Globe Hall')}`,
    );
    expect(toast).toHaveTextContent(BULK.othersDone(1, 'paused'));
    expect(screen.getByText(BULK.selected(1))).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.selectVenue('Globe Hall'))).toBeChecked();

    pauseCrawling.mockResolvedValue({ ok: true });
    fireEvent.click(within(toast).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByTestId('save-failed')).toBeNull());
    expect(pauseCrawling).toHaveBeenLastCalledWith('Globe Hall', {
      reason: 'waiting_on_permission',
      resume: { mode: 'manual' },
    });
  });

  it('re-crawls each venue and reports the ones the API refused', async () => {
    recrawlVenue.mockImplementation((id: string) =>
      Promise.resolve(
        id === 'Bluebird' ? { ok: false, status: 409 } : { ok: true },
      ),
    );
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Globe Hall');
    fireEvent.click(screen.getByRole('button', { name: BULK.recrawl(2) }));

    const toast = await screen.findByTestId('save-failed');
    expect(recrawlVenue).toHaveBeenCalledTimes(2);
    expect(toast).toHaveTextContent(BULK.recrawlFailed('Bluebird'));
    expect(toast).toHaveTextContent(BULK.othersDone(1, 'queued'));
    // A refusal is not an error: no "didn't go through" line.
    expect(toast).not.toHaveTextContent(BULK.recrawlErrored);
  });

  it('says a re-crawl that threw did not go through', async () => {
    recrawlVenue.mockImplementation((id: string) =>
      id === 'Bluebird'
        ? Promise.reject(new Error('network'))
        : Promise.resolve({ ok: true }),
    );
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Globe Hall');
    fireEvent.click(screen.getByRole('button', { name: BULK.recrawl(2) }));

    const toast = await screen.findByTestId('save-failed');
    expect(toast).toHaveTextContent(BULK.recrawlFailed('Bluebird'));
    // The whole sentence, so a doubled full stop can't slip back in.
    expect(toast).toHaveTextContent(
      'The request didn’t go through. The other one is queued. Nothing changed.',
    );
    expect(toast).not.toHaveTextContent('..');
  });

  it('sends Re-crawl only to the venues it can run on', async () => {
    recrawlVenue.mockResolvedValue({ ok: true });
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Levitt');
    check('Globe Hall');
    fireEvent.click(screen.getByRole('button', { name: BULK.recrawl(2) }));

    await waitFor(() => expect(recrawlVenue).toHaveBeenCalledTimes(2));
    expect(recrawlVenue.mock.calls.map(([id]) => id).sort()).toEqual([
      'Bluebird',
      'Globe Hall',
    ]);
    // What landed leaves the selection; Levitt was never sent, so stays out too.
    await waitFor(() =>
      expect(screen.getByText(BULK.selected(0))).toBeInTheDocument(),
    );
  });

  it('drops picks a search hides, so the bar acts only on what is shown', () => {
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Levitt');
    expect(screen.getByText(BULK.selected(2))).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(COPY.search), {
      target: { value: 'blue' },
    });
    const bar = within(screen.getByTestId('select-bar'));
    expect(bar.getByText(BULK.selected(1))).toBeInTheDocument();
    expect(bar.getByRole('button', { name: BULK.pause(1) })).toBeEnabled();

    fireEvent.change(screen.getByLabelText(COPY.search), {
      target: { value: '' },
    });
    expect(screen.getByLabelText(COPY.selectVenue('Levitt'))).not.toBeChecked();
    expect(screen.getByLabelText(COPY.selectVenue('Bluebird'))).toBeChecked();
  });

  it('drops picks a filter chip hides', () => {
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Levitt');
    fireEvent.click(screen.getByRole('button', { name: /^Paused/ }));
    expect(screen.getByText(BULK.selected(1))).toBeInTheDocument();
    expect(screen.getByLabelText(COPY.selectVenue('Levitt'))).toBeChecked();
  });

  it('holds the picks still while a bulk action is out', async () => {
    let finish: (value: { ok: true }) => void = () => {};
    recrawlVenue.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    fireEvent.click(screen.getByRole('button', { name: BULK.recrawl(1) }));

    const other = screen.getByLabelText(COPY.selectVenue('Globe Hall'));
    expect(other).toBeDisabled();
    expect(screen.getByLabelText(COPY.selectAll)).toBeDisabled();
    expect(screen.getByRole('button', { name: BULK.clear })).toBeDisabled();
    // Done too: the request settles into Select's state.
    expect(screen.getByRole('button', { name: COPY.done })).toBeDisabled();
    fireEvent.click(other);
    expect(other).not.toBeChecked();

    // `fanOut` starts each call a microtask after the click (its worker pool
    // awaits before sending), so `finish` only exists once the call is out.
    // Resolving before that resolved the no-op default and left it hanging.
    await waitFor(() => expect(recrawlVenue).toHaveBeenCalledTimes(1));
    finish({ ok: true });
    await waitFor(() => expect(other).toBeEnabled());
  });

  it('leaves no toast, panel or picks behind on Done after a failure', async () => {
    pauseCrawling.mockResolvedValue({ ok: false, error: null });
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    fireEvent.click(screen.getByRole('button', { name: BULK.pause(1) }));
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.pausePanel.submit }),
    );
    await screen.findByTestId('save-failed');

    fireEvent.click(screen.getByRole('button', { name: COPY.done }));
    expect(screen.queryByTestId('save-failed')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    expect(screen.getByText(BULK.selected(0))).toBeInTheDocument();
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('leaves Select when the window narrows to the phone', async () => {
    // Every component asking `useIsPhone` hears the change, as in a browser.
    const listeners = new Set<() => void>();
    const onChange = () => listeners.forEach((listener) => listener());
    const query = {
      matches: false,
      addEventListener: (_: string, listener: () => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_: string, listener: () => void) => {
        listeners.delete(listener);
      },
    };
    window.matchMedia = vi.fn().mockReturnValue(query);
    pauseCrawling.mockResolvedValue({ ok: false, error: null });
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    fireEvent.click(screen.getByRole('button', { name: BULK.pause(1) }));
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.pausePanel.submit }),
    );
    await screen.findByTestId('save-failed');

    query.matches = true;
    act(() => onChange());
    expect(screen.queryByTestId('select-bar')).toBeNull();
    // The failure stays said on the phone; it never vanishes unsaid.
    expect(screen.getByTestId('save-failed')).toBeInTheDocument();

    query.matches = false;
    act(() => onChange());
    expect(
      screen.getByRole('button', { name: COPY.select }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('select-bar')).toBeNull();
  });

  it('shows the head checkbox as mixed while only some rows are picked', () => {
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    const all = screen.getByLabelText<HTMLInputElement>(COPY.selectAll);
    expect(all.indeterminate).toBe(false);
    check('Bluebird');
    expect(all.indeterminate).toBe(true);
    expect(all).not.toBeChecked();
    fireEvent.click(all);
    expect(all.indeterminate).toBe(false);
    expect(all).toBeChecked();
  });

  it('reopens the bulk panel with the refusal inline when Try again is refused', async () => {
    pauseCrawling.mockResolvedValue({ ok: false, error: null });
    render(<VenuesList venues={mixed} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.select }));
    check('Bluebird');
    check('Globe Hall');
    fireEvent.click(screen.getByRole('button', { name: BULK.pause(2) }));
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.pausePanel.submit }),
    );
    const toast = await screen.findByTestId('save-failed');

    pauseCrawling.mockResolvedValue({
      ok: false,
      error: 'Pick a date after today',
    });
    fireEvent.click(within(toast).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pick a date after today',
    );
    expect(
      screen.getByText(ADMIN_COPY.pausePanel.titleMany(2)),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });
});
