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

// The mock drops data-testid, so links are found by role and name.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { RunDetailPanel } from './RunDetailPanel';
import type { RunPage, RunRow } from './run-data';
import { INSPECT_READY } from './runs-rules';
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

const RUNS: RunRow[] = [
  row({
    id: 'run-10',
    status: 'success',
    createdAt: '2026-11-10T10:01:00.000Z',
  }),
  row(),
  row({
    id: 'run-7',
    status: 'success',
    createdAt: '2026-11-07T10:01:00.000Z',
  }),
];

const page = (overrides: Partial<RunPage> = {}): RunPage => ({
  id: 'page-1',
  url: 'https://www.ballarena.com/events',
  finalUrl: null,
  httpStatus: 200,
  bytes: 2_000_000,
  ...overrides,
});

const renderPanel = (run: RunRow = RUNS[1]!, phone = false) => {
  const onClose = vi.fn();
  render(
    <RunDetailPanel
      venueId="venue-1"
      run={run}
      runs={RUNS}
      phone={phone}
      onClose={onClose}
    />,
  );
  return { onClose };
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

  it('marks the first failed page only', async () => {
    mockGet.mockResolvedValue([
      page(),
      page({ id: 'page-2', httpStatus: 503, bytes: null }),
      page({ id: 'page-3', httpStatus: null, bytes: null }),
    ]);
    renderPanel();
    const pages = await screen.findAllByTestId('run-page');
    expect(pages[0]!.getAttribute('data-first-failure')).toBeNull();
    expect(pages[1]!.getAttribute('data-first-failure')).toBe('true');
    expect(pages[1]!.textContent).toContain(DETAIL.firstFailure);
    expect(pages[2]!.getAttribute('data-first-failure')).toBeNull();
    expect(pages[2]!.textContent).toContain(DETAIL.noResponse);
    expect(screen.getAllByText(DETAIL.firstFailure)).toHaveLength(1);
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

  it('hides Inspect page and Compare until Inspect lands', async () => {
    expect(INSPECT_READY).toBe(false);
    mockGet.mockResolvedValue([page()]);
    renderPanel();
    await screen.findAllByTestId('run-page');
    expect(screen.queryByRole('link', { name: DETAIL.inspect })).toBeNull();
    expect(
      screen.queryByRole('link', { name: DETAIL.compare('Nov 7') }),
    ).toBeNull();
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
    renderPanel(RUNS[1]!, true);
    expect(screen.getByTestId('admin-sheet')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: '28 shows' })).toBeTruthy();
    expect(screen.getByText('Nov 9 · 3:02 AM · 212 s · $0.14')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(DETAIL.noPages)).toBeTruthy());
  });
});
