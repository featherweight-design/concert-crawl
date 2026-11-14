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
  returned: number = runs?.length ?? 0,
) =>
  render(
    <RunsTab
      venueId={VENUE}
      runs={runs === null ? null : { rows: runs, returned }}
      initialRun={initialRun}
      active
    />,
  );

/** The run detail has loaded its (empty) pages, so nothing settles late. */
const pagesSettled = () =>
  waitFor(() => expect(screen.getByText(DETAIL.noPages)).toBeTruthy());

// jsdom has no scrollIntoView.
const scrollIntoView = vi.fn();

describe('RunsTab', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', matchMediaStub(false));
    mockGet.mockReset();
    // The run detail's pages, when a test opens one.
    mockGet.mockResolvedValue([]);
    mockRefresh.mockReset();
    scrollIntoView.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
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

  it('lays desktop rows on the list grid so every line starts at one x', () => {
    renderTab();
    // The list owns the columns; the chip column fits the widest chip
    // ("Unchanged" outran the old 92px), and every row subgrids it.
    const list = screen.getByTestId('runs-list');
    expect(list.style.display).toBe('grid');
    expect(list.style.gridTemplateColumns).toContain('max-content');
    expect(list.style.gridTemplateColumns).not.toContain('92px');
    for (const row of rows()) {
      expect(row.style.display).toBe('grid');
      expect(row.style.gridTemplateColumns).toBe('subgrid');
      expect(row.parentElement!.style.gridTemplateColumns).toBe('subgrid');
    }
  });

  it('keeps phone rows as a flex row', () => {
    vi.stubGlobal('matchMedia', matchMediaStub(true));
    renderTab();
    expect(rows()[0]!.style.display).toBe('flex');
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

  it('Load more draws one rule: its own on desktop, the last row’s on the phone', () => {
    renderTab();
    expect(screen.getByTestId('runs-load-more').style.borderTop).toBe(
      '1px solid var(--border)',
    );
    cleanup();
    vi.stubGlobal('matchMedia', matchMediaStub(true));
    renderTab();
    expect(screen.getByTestId('runs-load-more').style.borderTop).toBe('');
    expect(rows().at(-1)!.style.borderBottom).toBe('1px solid var(--border)');
  });

  it('Load more keeps its rule on the phone when the filter leaves no rows', () => {
    vi.stubGlobal('matchMedia', matchMediaStub(true));
    renderTab([unchanged, ok]);
    fireEvent.click(screen.getByRole('button', { name: /^Not OK/ }));
    expect(screen.getByTestId('runs-load-more').style.borderTop).toBe(
      '1px solid var(--border)',
    );
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

  it('Load more decides on the rows the API sent, not the rows it could read', () => {
    // 20 sent, one unreadable: there may still be more behind it.
    renderTab(manyRuns(19), null, 20);
    expect(rows()).toHaveLength(19);
    expect(
      screen.getByRole('button', { name: COPY.loadMore(20) }),
    ).toBeTruthy();
  });

  it('drops a Load more response that lands after a refresh', async () => {
    let answer: (value: unknown) => void = () => undefined;
    mockGet.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { rerender } = renderTab(manyRuns(20));
    fireEvent.click(screen.getByRole('button', { name: COPY.loadMore(20) }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    const fresh = manyRuns(20);
    rerender(
      <RunsTab
        venueId={VENUE}
        runs={{ rows: fresh, returned: 20 }}
        initialRun={null}
        active
      />,
    );
    answer(manyRuns(40));
    // Let the dropped response settle; the list stays the refreshed page.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(rows()).toHaveLength(20);
    expect(screen.queryByText(COPY.loading)).toBeNull();
  });

  it('a refresh of the same venue keeps what Load more loaded, fresh rows winning', async () => {
    const { rerender } = renderTab(manyRuns(20));
    mockGet.mockResolvedValueOnce(manyRuns(33));
    fireEvent.click(screen.getByRole('button', { name: COPY.loadMore(20) }));
    await waitFor(() => expect(rows()).toHaveLength(33));
    const fresh = manyRuns(20).map((run, index) =>
      index === 0 ? row({ ...run, status: 'failed', reason: null }) : run,
    );
    rerender(
      <RunsTab
        venueId={VENUE}
        runs={{ rows: fresh, returned: 20 }}
        initialRun={null}
        active
      />,
    );
    expect(rows()).toHaveLength(33);
    expect(rows()[0]!.textContent).toContain(RUN.failed);
    expect(screen.getByTestId('runs-load-more').textContent).toContain(
      COPY.showingAll(33),
    );
  });

  it('another venue starts over from its own first page', async () => {
    const { rerender } = renderTab(manyRuns(20));
    mockGet.mockResolvedValueOnce(manyRuns(33));
    fireEvent.click(screen.getByRole('button', { name: COPY.loadMore(20) }));
    await waitFor(() => expect(rows()).toHaveLength(33));
    rerender(
      <RunsTab
        venueId="venue-2"
        runs={{ rows: [ok], returned: 1 }}
        initialRun={null}
        active
      />,
    );
    expect(rows()).toHaveLength(1);
  });

  it('selecting a row highlights it, opens its detail and puts ?run= in the URL', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    renderTab();
    fireEvent.click(rows()[1]!);
    expect(rows()[1]!.getAttribute('aria-current')).toBe('true');
    expect(rows()[0]!.getAttribute('aria-current')).toBeNull();
    // jsdom's history state is null; `expect.anything()` never matches null.
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      '',
      '/admin/venues/venue-1?tab=runs&run=run-ok',
    );
    expect(window.location.search).toBe('?tab=runs&run=run-ok');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading').textContent).toBe(
      '106 shows · 2 new',
    );
    // The token is awaited before the fetch goes out.
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/admin/crawl/runs/run-ok/pages',
        'test-token',
      ),
    );
    await pagesSettled();
  });

  it('the detail of an Unchanged run names the last full run from the list', async () => {
    renderTab();
    fireEvent.click(rows()[0]!);
    expect(
      within(screen.getByRole('dialog')).getByRole('heading').textContent,
    ).toBe('Page unchanged since Nov 10');
    await pagesSettled();
  });

  it('selecting another row moves the highlight and the detail', async () => {
    renderTab();
    fireEvent.click(rows()[1]!);
    await pagesSettled();
    fireEvent.click(rows()[2]!);
    expect(rows()[1]!.getAttribute('aria-current')).toBeNull();
    expect(rows()[2]!.getAttribute('aria-current')).toBe('true');
    expect(window.location.search).toBe('?tab=runs&run=run-failed');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(
      within(screen.getByRole('dialog')).getByRole('heading').textContent,
    ).toBe('Failed: timed out');
    await pagesSettled();
  });

  it('selecting the highlighted row again clears it, the detail and ?run=', async () => {
    renderTab();
    fireEvent.click(rows()[1]!);
    await pagesSettled();
    fireEvent.click(rows()[1]!);
    expect(rows()[1]!.getAttribute('aria-current')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.location.search).toBe('?tab=runs');
  });

  it('closing the detail clears the selection and ?run=', async () => {
    renderTab();
    fireEvent.click(rows()[1]!);
    await pagesSettled();
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.panel.close }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(rows()[1]!.getAttribute('aria-current')).toBeNull();
    expect(window.location.search).toBe('?tab=runs');
  });

  it('leaving the Runs tab closes the detail and clears the selection', async () => {
    const { rerender } = renderTab();
    fireEvent.click(rows()[1]!);
    await pagesSettled();
    const props = {
      venueId: VENUE,
      runs: { rows: [unchanged, ok, failed], returned: 3 },
      initialRun: null,
    };
    rerender(<RunsTab {...props} active={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    // Coming back finds nothing selected.
    rerender(<RunsTab {...props} active />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      rows().filter((row) => row.getAttribute('aria-current') !== null),
    ).toHaveLength(0);
  });

  it('Open run on the same run after a tab switch opens it again', async () => {
    // `?run=` is read through parseVenueRun, which takes a UUID.
    const RUN_ID = '0b7f7c1e-3c55-4d7e-9a43-6f0c2b1d9e21';
    const named = row({ id: RUN_ID, status: 'failed', reason: 'timeout' });
    const props = {
      venueId: VENUE,
      runs: { rows: [unchanged, named], returned: 2 },
      initialRun: RUN_ID,
    };
    window.history.replaceState(
      null,
      '',
      `/admin/venues/venue-1?tab=runs&run=${RUN_ID}`,
    );
    const { rerender } = render(<RunsTab {...props} active />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    await pagesSettled();
    // Another tab: the detail closes and the URL loses `?run=`.
    window.history.replaceState(null, '', '/admin/venues/venue-1?tab=overview');
    rerender(<RunsTab {...props} active={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    // Overview's Open run names the same run; `initialRun` is unchanged.
    window.history.replaceState(
      null,
      '',
      `/admin/venues/venue-1?tab=runs&run=${RUN_ID}`,
    );
    rerender(<RunsTab {...props} active />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(rows()[1]!.getAttribute('aria-current')).toBe('true');
    await pagesSettled();
  });

  it('coming back to the tab with a ?run= it hasn’t loaded drops it', () => {
    const props = {
      venueId: VENUE,
      runs: { rows: [unchanged, ok, failed], returned: 3 },
      initialRun: null,
    };
    const { rerender } = render(<RunsTab {...props} active={false} />);
    window.history.replaceState(
      null,
      '',
      '/admin/venues/venue-1?tab=runs&run=9d1f2a64-1b7c-4e0a-8f3e-2c5d6a7b8c90',
    );
    rerender(<RunsTab {...props} active />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.location.search).toBe('?tab=runs');
  });

  it('?run= on load opens that run, highlights it and scrolls it into view', async () => {
    window.history.replaceState(
      null,
      '',
      '/admin/venues/venue-1?tab=runs&run=run-failed',
    );
    renderTab(undefined, 'run-failed');
    expect(rows()[2]!.getAttribute('aria-current')).toBe('true');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(rows()[2]);
    expect(window.location.search).toBe('?tab=runs&run=run-failed');
    expect(
      within(screen.getByRole('dialog')).getByRole('heading').textContent,
    ).toBe('Failed: timed out');
    await pagesSettled();
  });

  it('opens the detail as a bottom sheet on the phone', async () => {
    vi.stubGlobal('matchMedia', matchMediaStub(true));
    renderTab();
    fireEvent.click(rows()[1]!);
    expect(screen.getByTestId('admin-sheet')).toBeTruthy();
    await pagesSettled();
  });

  it('a ?run= not in the loaded list highlights nothing and leaves the URL', () => {
    window.history.replaceState(
      null,
      '',
      '/admin/venues/venue-1?tab=runs&run=run-gone',
    );
    renderTab(undefined, 'run-gone');
    expect(
      rows().filter((row) => row.getAttribute('aria-current') !== null),
    ).toHaveLength(0);
    expect(window.location.search).toBe('?tab=runs');
  });
});
