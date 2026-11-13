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

// A fresh getToken on every render, as Clerk is free to hand over.
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('test-token') }),
}));

// The mock drops data-testid, so links are found by role and name.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { RunDetailPanel } from './RunDetailPanel';
import type { RunPage, RunRow } from './run-data';
import type { LastFullRun } from './runs-rules';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const DETAIL = ADMIN_COPY.runDetail;
const RUN = ADMIN_COPY.venuesList.latestRun;

const row = (overrides: Partial<RunRow> = {}): RunRow => ({
  id: 'run-9',
  status: 'partial',
  reason: null,
  eventsFound: 28,
  eventsInserted: 0,
  durationMs: 212000,
  llmCostUsd: 0.14,
  errorMessage: null,
  createdAt: '2026-11-09T10:02:00.000Z',
  ...overrides,
});

const LAST_FULL: LastFullRun = {
  id: 'run-7',
  at: '2026-11-07T10:01:00.000Z',
  eventsFound: 106,
};

const page = (overrides: Partial<RunPage> = {}): RunPage => ({
  id: 'page-1',
  url: 'https://www.ballarena.com/events',
  finalUrl: null,
  httpStatus: 200,
  bytes: 2_000_000,
  ...overrides,
});

const renderPanel = (run: RunRow = row(), phone = false) => {
  const onClose = vi.fn();
  const view = render(
    <RunDetailPanel
      venueId="venue-1"
      run={run}
      lastFullRun={LAST_FULL}
      phone={phone}
      onClose={onClose}
    />,
  );
  return { onClose, ...view };
};

describe('RunDetailPanel', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('heads with the chip, then date · time · duration · cost, then the summary', async () => {
    mockGet.mockResolvedValue([]);
    renderPanel();
    const panel = screen.getByRole('dialog');
    expect(within(panel).getByText(RUN.partial)).toBeTruthy();
    expect(
      within(panel).getByText('Nov 9 · 3:02 AM · 212 s · $0.14'),
    ).toBeTruthy();
    expect(within(panel).getByRole('heading').textContent).toBe('28 shows');
    await waitFor(() => expect(screen.getByText(DETAIL.noPages)).toBeTruthy());
  });

  it('leaves out a duration the run never recorded', async () => {
    mockGet.mockResolvedValue([]);
    renderPanel(row({ durationMs: null, llmCostUsd: null }));
    expect(screen.getByText('Nov 9 · 3:02 AM · $0')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(DETAIL.noPages)).toBeTruthy());
  });

  it('an Unchanged run names the last full run, and says what it kept', async () => {
    mockGet.mockResolvedValue([]);
    renderPanel(
      row({
        status: 'skipped',
        reason: 'page_unchanged',
        eventsFound: 0,
        durationMs: null,
      }),
    );
    expect(
      within(screen.getByRole('dialog')).getByRole('heading').textContent,
    ).toBe('Page unchanged since Nov 7');
    expect(screen.getByTestId('run-detail').textContent).toContain('Nov 7');
    await waitFor(() => expect(screen.getByText(DETAIL.noPages)).toBeTruthy());
  });

  it('loads the run’s pages, shortened, with status and size', async () => {
    mockGet.mockResolvedValue([
      page(),
      page({
        id: 'page-2',
        url: 'https://www.ballarena.com/events?page=2',
        bytes: 640 * 1024,
      }),
    ]);
    renderPanel();
    expect(screen.getByText(DETAIL.loadingPages)).toBeTruthy();
    const pages = await screen.findAllByTestId('run-page');
    expect(mockGet).toHaveBeenCalledWith(
      '/v1/admin/crawl/runs/run-9/pages',
      'test-token',
    );
    expect(pages[0]!.textContent).toContain('ballarena.com/events');
    expect(pages[0]!.textContent).toContain('200 · 1.9 MB');
    expect(pages[1]!.textContent).toContain('…/events?page=2');
    expect(pages[1]!.textContent).toContain('200 · 640 KB');
    expect(screen.queryByText(DETAIL.firstFailure)).toBeNull();
  });

  it('the short URL is itself the link to the full one, named by it, never a hover title', async () => {
    const full = 'https://www.ballarena.com/events?page=2';
    mockGet.mockResolvedValue([page(), page({ id: 'page-2', url: full })]);
    renderPanel();
    const urls = await screen.findAllByTestId('run-page-url');
    const link = within(urls[1]!).getByRole('link', { name: full });
    expect(link.getAttribute('href')).toBe(full);
    expect(link.textContent).toBe('…/events?page=2');
    expect(screen.getByRole('dialog').querySelector('details')).toBeNull();
    // House rule: no native tooltip anywhere in the panel.
    expect(screen.getByRole('dialog').querySelector('[title]')).toBeNull();
  });

  it('a retry of the first page reads as its path, not the first page again', async () => {
    mockGet.mockResolvedValue([page(), page({ id: 'page-2' })]);
    renderPanel();
    const urls = await screen.findAllByTestId('run-page-url');
    expect(urls[0]!.textContent).toBe('ballarena.com/events');
    expect(urls[1]!.textContent).toBe('/events');
  });

  it('shows where a redirect landed after the page’s URL', async () => {
    mockGet.mockResolvedValue([
      page({ finalUrl: 'https://www.ballarena.com/events/2026' }),
      page({
        id: 'page-2',
        url: 'https://www.ballarena.com/events?page=2',
        finalUrl: 'https://www.ballarena.com/events?page=2',
      }),
    ]);
    renderPanel();
    const urls = await screen.findAllByTestId('run-page-url');
    expect(urls[0]!.textContent).toContain(
      DETAIL.redirectedTo('…/events/2026'),
    );
    // A finalUrl that is the URL itself is no redirect.
    expect(within(urls[1]!).queryByTestId('run-page-redirect')).toBeNull();
  });

  it('marks the first failed page only; a page with no status is neutral', async () => {
    mockGet.mockResolvedValue([
      page({ httpStatus: null }),
      page({ id: 'page-2', httpStatus: 503, bytes: null }),
      page({ id: 'page-3', httpStatus: 500, bytes: null }),
    ]);
    renderPanel();
    const pages = await screen.findAllByTestId('run-page');
    expect(pages[0]!.getAttribute('data-first-failure')).toBeNull();
    expect(pages[0]!.textContent).toContain(`${DETAIL.noStatus} · 1.9 MB`);
    expect(pages[1]!.getAttribute('data-first-failure')).toBe('true');
    expect(pages[1]!.textContent).toContain(DETAIL.firstFailure);
    expect(pages[2]!.getAttribute('data-first-failure')).toBeNull();
    expect(screen.getAllByText(DETAIL.firstFailure)).toHaveLength(1);
  });

  it('does not fetch the pages again when getToken changes identity', async () => {
    mockGet.mockResolvedValue([page()]);
    const { rerender, onClose } = renderPanel();
    await screen.findAllByTestId('run-page');
    // The Clerk mock hands over a new getToken on every render.
    rerender(
      <RunDetailPanel
        venueId="venue-1"
        run={row()}
        lastFullRun={LAST_FULL}
        phone={false}
        onClose={onClose}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('a redirect or a 304 is not a failure', async () => {
    mockGet.mockResolvedValue([
      page({ httpStatus: 301 }),
      page({ id: 'page-2', httpStatus: 304, bytes: null }),
      page({ id: 'page-3', httpStatus: 404, bytes: null }),
    ]);
    renderPanel();
    const pages = await screen.findAllByTestId('run-page');
    expect(pages[0]!.getAttribute('data-first-failure')).toBeNull();
    expect(pages[1]!.getAttribute('data-first-failure')).toBeNull();
    expect(pages[2]!.getAttribute('data-first-failure')).toBe('true');
  });

  it('shows Couldn’t load when the pages fail, and Try again re-asks', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGet.mockRejectedValueOnce(new Error('boom'));
    renderPanel();
    await screen.findByTestId('couldnt-load');
    mockGet.mockResolvedValueOnce([page()]);
    fireEvent.click(
      screen.getByRole('button', {
        name: ADMIN_COPY.states.couldntLoad.tryAgain,
      }),
    );
    expect(await screen.findAllByTestId('run-page')).toHaveLength(1);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('treats a body that isn’t a list as Couldn’t load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGet.mockResolvedValue({ data: [] });
    renderPanel();
    expect(await screen.findByTestId('couldnt-load')).toBeTruthy();
  });

  it('never shows an older run’s pages under a newer one', async () => {
    let answerOld: (value: unknown) => void = () => undefined;
    mockGet.mockReturnValueOnce(
      new Promise((resolve) => {
        answerOld = resolve;
      }),
    );
    mockGet.mockResolvedValueOnce([
      page({ id: 'new-page', url: 'https://example.com/new' }),
    ]);
    const { rerender, onClose } = renderPanel();
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    rerender(
      <RunDetailPanel
        venueId="venue-1"
        run={row({ id: 'run-10' })}
        lastFullRun={LAST_FULL}
        phone={false}
        onClose={onClose}
      />,
    );
    const pages = await screen.findAllByTestId('run-page');
    expect(pages[0]!.textContent).toContain('example.com/new');
    answerOld([page({ id: 'old-page', url: 'https://example.com/old' })]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const after = screen.getAllByTestId('run-page');
    expect(after).toHaveLength(1);
    expect(after[0]!.textContent).toContain('example.com/new');
  });

  it('Inspect page opens on the first failed page, and Compare on the last full run', async () => {
    mockGet.mockResolvedValue([
      page(),
      page({ id: 'page-2', httpStatus: 503 }),
    ]);
    renderPanel();
    await screen.findAllByTestId('run-page');
    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: DETAIL.inspect }).getAttribute('href'),
      ).toBe('/admin/venues/venue-1/inspect/run-9?page=page-2'),
    );
    // Compare keeps the page: the last full run's page fetched from its URL.
    expect(
      screen
        .getByRole('link', { name: DETAIL.compare('Nov 7') })
        .getAttribute('href'),
    ).toBe(
      `/admin/venues/venue-1/inspect/run-7?url=${encodeURIComponent('https://www.ballarena.com/events')}`,
    );
  });

  it('each PAGES row has its own Inspect link, beside the live URL', async () => {
    const second = 'https://www.ballarena.com/events?page=2';
    mockGet.mockResolvedValue([page(), page({ id: 'page-2', url: second })]);
    renderPanel();
    const rows = await screen.findAllByTestId('run-page');
    const inspect = within(rows[1]!).getByRole('link', {
      name: DETAIL.inspectRowLabel(second),
    });
    expect(inspect.getAttribute('href')).toBe(
      '/admin/venues/venue-1/inspect/run-9?page=page-2',
    );
    expect(
      within(rows[1]!).getByRole('link', { name: second }).getAttribute('href'),
    ).toBe(second);
    expect(
      within(rows[0]!).getByTestId('run-page-inspect').getAttribute('href'),
    ).toBe('/admin/venues/venue-1/inspect/run-9?page=page-1');
  });

  it('Inspect page opens on the first page when none failed', async () => {
    mockGet.mockResolvedValue([page(), page({ id: 'page-2' })]);
    renderPanel();
    await screen.findAllByTestId('run-page');
    expect(
      screen.getByRole('link', { name: DETAIL.inspect }).getAttribute('href'),
    ).toBe('/admin/venues/venue-1/inspect/run-9?page=page-1');
  });

  it('leaves Compare off without an earlier full run', async () => {
    mockGet.mockResolvedValue([page()]);
    render(
      <RunDetailPanel
        venueId="venue-1"
        run={row()}
        lastFullRun={null}
        phone={false}
        onClose={vi.fn()}
      />,
    );
    await screen.findAllByTestId('run-page');
    expect(screen.getByRole('link', { name: DETAIL.inspect })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /^Compare/ })).toBeNull();
  });

  it('a run whose pages loaded and are none offers neither Inspect nor Compare', async () => {
    mockGet.mockResolvedValue([]);
    renderPanel();
    await waitFor(() => expect(screen.getByText(DETAIL.noPages)).toBeTruthy());
    expect(screen.queryByRole('link', { name: DETAIL.inspect })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Compare/ })).toBeNull();
  });

  it('while the pages load, Inspect lets the route pick its default', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPanel();
    expect(
      screen.getByRole('link', { name: DETAIL.inspect }).getAttribute('href'),
    ).toBe('/admin/venues/venue-1/inspect/run-9');
  });

  it('closes from its ✕', async () => {
    mockGet.mockResolvedValue([]);
    const { onClose } = renderPanel();
    fireEvent.click(
      screen.getByRole('button', { name: ADMIN_COPY.panel.close }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(DETAIL.noPages)).toBeTruthy());
  });

  it('is a bottom sheet on the phone, titled by the summary', async () => {
    mockGet.mockResolvedValue([]);
    renderPanel(row(), true);
    expect(screen.getByTestId('admin-sheet')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: '28 shows' })).toBeTruthy();
    expect(screen.getByText('Nov 9 · 3:02 AM · 212 s · $0.14')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(DETAIL.noPages)).toBeTruthy());
  });
});
