// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';

const mockGet = vi.fn();
vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('test-token') }),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));

// The mock drops data-testid, so links are found by role and name.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Fault acknowledgement fetches behind Clerk auth; it has its own suite.
vi.mock(
  '@/components/admin/fault-acknowledge-control/FaultAcknowledgeControl',
  () => ({
    FaultAcknowledgeControl: ({ venueId }: { venueId: string }) => (
      <div data-testid="fault-ack">{venueId}</div>
    ),
  }),
);

import { RunsTab } from './RunsTab';
import type { RunRow } from '@/components/admin/crawl-runs/run-data';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.venueRuns;
const DETAIL = ADMIN_COPY.runDetail;
const RUN = ADMIN_COPY.venuesList.latestRun;

const VENUE = 'venue-1';

const matchMediaStub =
  (phone: boolean) =>
  (query: string): MediaQueryList => ({
    matches: phone,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  });

const row = (overrides: Partial<RunRow> = {}): RunRow => ({
  id: 'run-ok',
  status: 'success',
  reason: null,
  eventsFound: 106,
  eventsInserted: 2,
  durationMs: 230000,
  llmCostUsd: 0.15,
  errorMessage: null,
  createdAt: '2026-11-10T10:01:00.000Z',
  ...overrides,
});

const unchanged = row({
  id: 'run-unchanged',
  status: 'skipped',
  reason: 'page_unchanged',
  eventsFound: 0,
  eventsInserted: 0,
  durationMs: null,
  llmCostUsd: null,
  createdAt: '2026-11-11T10:02:00.000Z',
});
const ok = row();
const failed = row({
  id: 'run-failed',
  status: 'failed',
  reason: 'timeout',
  eventsFound: 0,
  eventsInserted: 0,
  createdAt: '2026-11-09T10:02:00.000Z',
});

/** n OK runs, a day apart, newest first. */
const manyRuns = (count: number, prefix = 'r'): RunRow[] =>
  Array.from({ length: count }, (_, index) =>
    row({
      id: `${prefix}-${index}`,
      createdAt: new Date(
        Date.UTC(2026, 10, 11, 10) - index * 86_400_000,
      ).toISOString(),
    }),
  );

const rows = () => screen.queryAllByTestId('run-row');

const renderTab = (
  runs: RunRow[] | null = [unchanged, ok, failed],
  initialRun: string | null = null,
) => render(<RunsTab venueId={VENUE} runs={runs} initialRun={initialRun} />);

describe('RunsTab', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub(false));
    mockGet.mockReset();
    mockRefresh.mockReset();
    // The run detail's pages; each test that opens one may override.
    mockGet.mockResolvedValue([]);
    window.history.replaceState(null, '', '/admin/venues/venue-1?tab=runs');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('puts fault acknowledgement at the top (ruling a)', () => {
    renderTab();
    expect(screen.getByTestId('fault-ack').textContent).toBe(VENUE);
  });

  it('draws a row per run: date over time, chip, line, duration and cost', () => {
    renderTab();
    expect(rows()).toHaveLength(3);
    const first = rows()[0]!;
    expect(first.textContent).toContain('Nov 11');
    expect(first.textContent).toContain('3:02 AM');
    expect(first.textContent).toContain(RUN.unchanged);
    expect(first.textContent).toContain('Page unchanged since Nov 10');
    expect(first.textContent).toContain('—');
    expect(first.textContent).toContain('$0');
    const second = rows()[1]!;
    expect(second.textContent).toContain(RUN.success);
    expect(second.textContent).toContain('106 shows · 2 new');
    expect(second.textContent).toContain('230 s');
    expect(second.textContent).toContain('$0.15');
    expect(rows()[2]!.textContent).toContain('Failed: timed out');
  });

  it('Not OK keeps the runs that weren’t, and counts them', () => {
    renderTab();
    const notOk = screen.getByRole('button', { name: /^Not OK/ });
    expect(
      within(notOk).getByLabelText(COPY.filters.notOkCount(1)),
    ).toBeTruthy();
    fireEvent.click(notOk);
    expect(notOk.getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(1);
    expect(rows()[0]!.textContent).toContain('Failed: timed out');
  });

  it('Not OK with nothing in it shows the filter-empty state, and Show all', () => {
    renderTab([unchanged, ok]);
    fireEvent.click(screen.getByRole('button', { name: /^Not OK/ }));
    expect(rows()).toHaveLength(0);
    expect(screen.getByTestId('runs-filter-empty').textContent).toContain(
      COPY.filterEmpty(2),
    );
    fireEvent.click(screen.getByRole('button', { name: COPY.showAll }));
    expect(rows()).toHaveLength(2);
    expect(
      screen
        .getByRole('button', { name: COPY.filters.all })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('says "No runs yet" when the venue has none', () => {
    renderTab([]);
    expect(screen.getByText(RUN.never)).toBeTruthy();
    expect(
      screen.queryByRole('group', { name: COPY.filters.label }),
    ).toBeNull();
    expect(screen.queryByTestId('runs-load-more')).toBeNull();
  });

  it('shows Couldn’t load when the first page failed, and Try again refreshes', () => {
    renderTab(null);
    expect(screen.getByTestId('couldnt-load')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: ADMIN_COPY.states.couldntLoad.tryAgain,
      }),
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    // Fault acknowledgement stands on its own fetch.
    expect(screen.getByTestId('fault-ack')).toBeTruthy();
  });

  it('a short first page has nothing behind it: "Showing all", no Load more', () => {
    renderTab();
    expect(screen.getByTestId('runs-load-more').textContent).toContain(
      COPY.showingAll(3),
    );
    expect(
      screen.queryByRole('button', { name: COPY.loadMore(20) }),
    ).toBeNull();
  });

  it('Load more re-asks with a bigger limit and shows the longer list', async () => {
    renderTab(manyRuns(20));
    expect(screen.getByTestId('runs-load-more').textContent).toContain(
      COPY.showing(20),
    );
    mockGet.mockResolvedValueOnce(manyRuns(33));
    fireEvent.click(screen.getByRole('button', { name: COPY.loadMore(20) }));
    expect(screen.getByText(COPY.loading)).toBeTruthy();
    await waitFor(() => expect(rows()).toHaveLength(33));
    expect(mockGet).toHaveBeenCalledWith(
      `/v1/admin/crawl/runs?venueId=${VENUE}&limit=40`,
      'test-token',
    );
    // 33 of 40 asked: nothing behind it.
    expect(screen.getByTestId('runs-load-more').textContent).toContain(
      COPY.showingAll(33),
    );
    expect(
      screen.queryByRole('button', { name: COPY.loadMore(20) }),
    ).toBeNull();
  });

  it('a failed Load more keeps the rows and offers Try again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderTab(manyRuns(20));
    mockGet.mockRejectedValueOnce(new Error('boom'));
    fireEvent.click(screen.getByRole('button', { name: COPY.loadMore(20) }));
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(COPY.loadMoreFailed),
    );
    expect(rows()).toHaveLength(20);
    expect(screen.getByRole('button', { name: COPY.tryAgain })).toBeTruthy();
  });

  it('selecting a row opens its detail and puts ?run= in the URL', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    renderTab();
    fireEvent.click(rows()[1]!);
    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByText('106 shows · 2 new')).toBeTruthy();
    expect(rows()[1]!.getAttribute('aria-current')).toBe('true');
    expect(replaceState).toHaveBeenLastCalledWith(
      expect.anything(),
      '',
      '/admin/venues/venue-1?tab=runs&run=run-ok',
    );
    expect(window.location.search).toBe('?tab=runs&run=run-ok');
    expect(mockGet).toHaveBeenCalledWith(
      '/v1/admin/crawl/runs/run-ok/pages',
      'test-token',
    );
  });

  it('closing the detail clears ?run=', async () => {
    renderTab();
    fireEvent.click(rows()[1]!);
    await screen.findByRole('dialog');
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.panel.close }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.location.search).toBe('?tab=runs');
  });

  it('?run= on load opens that run', async () => {
    renderTab(undefined, 'run-failed');
    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByText('Failed: timed out')).toBeTruthy();
    await waitFor(() =>
      expect(within(panel).getByText(DETAIL.noPages)).toBeTruthy(),
    );
  });

  it('a ?run= not in the loaded list opens nothing', () => {
    renderTab(undefined, 'run-gone');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('on the phone, a row opens the detail as a sheet', async () => {
    vi.stubGlobal('matchMedia', matchMediaStub(true));
    renderTab();
    fireEvent.click(rows()[0]!);
    await screen.findByRole('dialog');
    expect(screen.getByTestId('admin-sheet')).toBeTruthy();
    expect(screen.queryByTestId('side-panel')).toBeNull();
  });
});
