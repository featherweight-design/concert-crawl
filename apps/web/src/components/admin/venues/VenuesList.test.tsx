// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
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
    expect(bar.getByRole('button', { name: BULK.pause(2) })).toBeEnabled();

    check('Bluebird');
    expect(bar.getByRole('button', { name: BULK.recrawl(1) })).toBeEnabled();
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
      Promise.resolve(id !== 'Bluebird'),
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
