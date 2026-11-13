// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';

const mockPauseCrawling = vi.fn();
const mockResumeCrawling = vi.fn();
vi.mock('@/lib/actions/venues', () => ({
  pauseCrawling: (...args: unknown[]) => mockPauseCrawling(...args),
  resumeCrawling: (...args: unknown[]) => mockResumeCrawling(...args),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

import { CrawlPauseControl } from './CrawlPauseControl';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import type { CrawlPauseControlProps } from './definitions/types';

const COPY = ADMIN_COPY.venueDetailsClient.dangerZone.crawlPause;
const PANEL = ADMIN_COPY.pausePanel;

const venue = (
  over: Partial<CrawlPauseControlProps['venue']> = {},
): CrawlPauseControlProps['venue'] => ({
  id: 'venue-1',
  name: 'Ball Arena',
  crawlPausedAt: null,
  crawlPauseReason: null,
  crawlPauseNote: null,
  consecutiveFailures: 0,
  crawlPausedByName: null,
  ...over,
});

describe('CrawlPauseControl', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    mockPauseCrawling.mockResolvedValue({ ok: true });
    mockResumeCrawling.mockResolvedValue({ ok: true });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('opens the Pause panel for this venue and sends the full body', async () => {
    render(<CrawlPauseControl venue={venue()} showCount={235} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.pauseButton }));

    expect(screen.getByText(PANEL.title('Ball Arena'))).toBeTruthy();
    expect(screen.getByText(PANEL.body(235))).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: PANEL.submit }));

    await waitFor(() =>
      expect(mockPauseCrawling).toHaveBeenCalledWith('venue-1', {
        reason: 'waiting_on_permission',
        resume: { mode: 'manual' },
      }),
    );
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(screen.queryByText(PANEL.title('Ball Arena'))).toBeNull();
  });

  it('closes on a failed save and offers Try again', async () => {
    mockPauseCrawling.mockResolvedValueOnce({ ok: false, error: null });
    render(<CrawlPauseControl venue={venue()} showCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.pauseButton }));
    fireEvent.click(screen.getByRole('button', { name: PANEL.submit }));

    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(mockPauseCrawling).toHaveBeenCalledTimes(2));
  });

  it('reopens the panel with the refusal inline when Try again is refused', async () => {
    mockPauseCrawling
      .mockResolvedValueOnce({ ok: false, error: null })
      .mockResolvedValueOnce({ ok: false, error: 'Pick a date after today' });
    render(<CrawlPauseControl venue={venue()} showCount={1} />);
    fireEvent.click(screen.getByRole('button', { name: COPY.pauseButton }));
    fireEvent.click(
      screen.getByRole('radio', { name: PANEL.reasons.site_broken_or_moved }),
    );
    fireEvent.click(screen.getByRole('button', { name: PANEL.submit }));
    await waitFor(() => expect(screen.getByTestId('save-failed')).toBeTruthy());
    expect(screen.queryByText(PANEL.title('Ball Arena'))).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Pick a date after today');
    expect(screen.getByText(PANEL.title('Ball Arena'))).toBeTruthy();
    // It reopens on the choices that were sent.
    expect(
      (
        screen.getByRole('radio', {
          name: PANEL.reasons.site_broken_or_moved,
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('says who paused it, when and why, and resumes it', async () => {
    render(
      <CrawlPauseControl
        venue={venue({
          crawlPausedAt: '2026-10-28T15:00:00.000Z',
          crawlPausedByName: 'Hugh',
          crawlPauseReason: 'waiting_on_permission',
        })}
        showCount={18}
      />,
    );
    expect(screen.getByTestId('crawl-pause-line').textContent).toBe(
      'Paused by Hugh, Oct 28: waiting on permission.',
    );

    fireEvent.click(screen.getByRole('button', { name: COPY.resumeButton }));
    await waitFor(() =>
      expect(mockResumeCrawling).toHaveBeenCalledWith('venue-1'),
    );
    expect(mockPauseCrawling).not.toHaveBeenCalled();
  });

  it('shows the API’s reason when Resume is refused', async () => {
    const refusal =
      'This venue asked us to remove its data, so it stays off the site.';
    mockResumeCrawling.mockResolvedValueOnce({ ok: false, error: refusal });
    render(
      <CrawlPauseControl
        venue={venue({ crawlPausedAt: '2026-10-28T15:00:00.000Z' })}
        showCount={1}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: COPY.resumeButton }));
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe(refusal);
  });

  it('reads an auto-pause without the held re-crawl hint', () => {
    render(
      <CrawlPauseControl
        venue={venue({
          crawlPausedAt: '2026-10-28T15:00:00.000Z',
          crawlPauseReason: null,
          consecutiveFailures: 3,
        })}
        showCount={14}
      />,
    );
    expect(screen.getByTestId('crawl-pause-line').textContent).toBe(
      'Auto-paused after 3 failures.',
    );
  });
});
