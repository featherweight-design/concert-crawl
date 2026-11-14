// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  act,
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

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Null is the media query not read yet.
let phone: boolean | null = false;
vi.mock('@/components/admin/primitives/useIsPhone', () => ({
  ADMIN_PHONE_MAX_WIDTH: 720,
  useIsPhone: () => phone ?? false,
  useIsPhoneResolved: () => phone,
}));

import {
  CRAWL_ALL_ENDPOINT,
  CrawlAllButton,
  CrawlAllDialog,
  TRIGGER_CLASS,
  type CrawlAllEstimateView,
} from './CrawlAllDialog';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { adminButtonVariantStyle } from '@/components/admin/primitives/AdminButton';

const COPY = ADMIN_COPY.crawl.crawlAll;
const TRY_AGAIN = ADMIN_COPY.states.saveFailed.tryAgain;

const estimate = (
  overrides: Partial<CrawlAllEstimateView> = {},
): CrawlAllEstimateView => ({
  total: 21,
  eligible: 19,
  skipped: [
    { name: 'Levitt Pavilion', reason: 'paused' },
    { name: 'The Ogden', reason: 'blocked' },
  ],
  usual: { durationMs: 20 * 60000, costUsd: 0.8 },
  // 09:07 UTC on Nov 15 is 2:07 AM Mountain (standard time).
  nextCrawlAt: '2026-11-15T09:07:00.000Z',
  ...overrides,
});

const mockFetch = vi.fn();

/** POST /v1/admin/crawl's 202, through the run-all proxy. */
const queued = (count = 19) => ({
  ok: true,
  json: async () => ({ success: true, data: { triggerIds: [], count } }),
});

const renderDialog = () => {
  const onClose = vi.fn();
  const onStarted = vi.fn();
  render(<CrawlAllDialog onClose={onClose} onStarted={onStarted} />);
  return { onClose, onStarted };
};

const body = async () =>
  (await screen.findByTestId('crawl-all-body')).textContent;

describe('CrawlAllDialog', () => {
  beforeEach(() => {
    phone = false;
    mockGet.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads the estimate when it opens, with skeleton bars and a held confirm until then', async () => {
    mockGet.mockReturnValue(new Promise(() => undefined));
    renderDialog();
    expect(screen.getByText(COPY.title)).toBeTruthy();
    const status = screen.getByRole('status');
    expect(status.textContent).toBe(COPY.loading);
    expect(status.className).toBe('sr-only');
    expect(screen.getByTestId('crawl-all-loading')).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: COPY.confirmLoading })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: COPY.cancel })
        .hasAttribute('disabled'),
    ).toBe(false);
    // The read waits on Clerk's token (a promise), so it lands a tick after
    // the first render, not during it.
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        '/v1/admin/crawl/estimate',
        'test-token',
      ),
    );
  });

  it('says how many, which are skipped and why, and what recent nights took', async () => {
    mockGet.mockResolvedValue(estimate());
    renderDialog();
    expect(await body()).toBe(
      '19 of 21 venues are queued now and crawled one at a time, 3 s between pages, with robots.txt checked first. Skipped: Levitt Pavilion (paused), The Ogden (blocked). Recent crawls took about 20 minutes and cost about $0.80.',
    );
    expect(
      screen.getByText('Tonight’s 2:07 AM crawl still runs.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Crawl all 19' })).toBeTruthy();
  });

  it('drops the time and cost sentence with no history', async () => {
    mockGet.mockResolvedValue(estimate({ usual: null }));
    renderDialog();
    const text = await body();
    expect(text).toContain('Skipped: Levitt Pavilion (paused)');
    expect(text).not.toContain('Recent crawls');
  });

  it('drops the Skipped sentence when nothing is skipped', async () => {
    mockGet.mockResolvedValue(estimate({ eligible: 21, skipped: [] }));
    renderDialog();
    const text = await body();
    expect(text).not.toContain('Skipped:');
    expect(text).toContain('All 21 venues are queued now');
  });

  it('speaks of one venue in the singular', async () => {
    mockGet.mockResolvedValue(
      estimate({ total: 1, eligible: 1, skipped: [], usual: null }),
    );
    renderDialog();
    expect(await body()).toBe(
      'The venue is queued now and crawled one at a time, 3 s between pages, with robots.txt checked first.',
    );
  });

  it('names a reason it does not know in its own word', async () => {
    mockGet.mockResolvedValue(
      estimate({
        eligible: 19,
        skipped: [
          { name: 'Black Box', reason: 'unverified' },
          { name: 'Meow Wolf', reason: 'archived' },
        ],
      }),
    );
    renderDialog();
    expect(await body()).toContain(
      'Skipped: Black Box (not yet verified), Meow Wolf (archived).',
    );
  });

  it('shows the none state with no confirm when nothing is eligible', async () => {
    mockGet.mockResolvedValue(estimate({ eligible: 0 }));
    renderDialog();
    expect(await screen.findByText(COPY.noneTitle)).toBeTruthy();
    expect(await body()).toBe(COPY.noneBody(21));
    expect(screen.queryByRole('button', { name: /Crawl all/ })).toBeNull();
    expect(
      screen.getByRole('link', { name: COPY.openVenues }).getAttribute('href'),
    ).toBe('/admin/venues');
    expect(screen.getByRole('button', { name: COPY.close })).toBeTruthy();
  });

  it.each([
    [0, 'No venues yet. Add one from Venues.'],
    [
      1,
      'The venue is paused, blocked, hidden or not yet verified. Fix it from Venues to crawl it.',
    ],
    [
      21,
      'All 21 venues are paused, blocked, hidden or not yet verified. Fix one from Venues to crawl it.',
    ],
  ])('words the none state for %i venues', async (total, text) => {
    mockGet.mockResolvedValue(estimate({ total, eligible: 0, skipped: [] }));
    renderDialog();
    expect(await body()).toBe(text);
  });

  it('opens the phone none state on Close, painted under Open Venues', async () => {
    phone = true;
    mockGet.mockResolvedValue(estimate({ eligible: 0 }));
    renderDialog();
    const close = await screen.findByRole('button', { name: COPY.close });
    const open = screen.getByRole('link', { name: COPY.openVenues });
    // Close is first in the DOM; the footer paints bottom-up.
    expect(
      close.compareDocumentPosition(open) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(close.parentElement?.style.flexDirection).toBe('column-reverse');
  });

  it('renders nothing until it knows phone from desktop', () => {
    phone = null;
    mockGet.mockReturnValue(new Promise(() => undefined));
    renderDialog();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('counts again instead of closing when the post queued nothing', async () => {
    mockGet.mockResolvedValueOnce(estimate());
    mockGet.mockResolvedValueOnce(estimate({ eligible: 0 }));
    mockFetch.mockResolvedValue(queued(0));
    const { onStarted } = renderDialog();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Crawl all 19' }),
    );
    expect(await screen.findByText(COPY.noneTitle)).toBeTruthy();
    expect(onStarted).not.toHaveBeenCalled();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('posts once, however often the confirm is pressed', async () => {
    mockGet.mockResolvedValue(estimate());
    mockFetch.mockResolvedValue(queued());
    const { onStarted } = renderDialog();
    const confirm = await screen.findByRole('button', { name: 'Crawl all 19' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(onStarted).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(CRAWL_ALL_ENDPOINT, {
      method: 'POST',
    });
    // The number queued matched the one confirmed.
    expect(onStarted).toHaveBeenCalledWith(null);
  });

  it('hands back the real count when it differs from the one confirmed', async () => {
    mockGet.mockResolvedValue(estimate());
    mockFetch.mockResolvedValue(queued(17));
    const { onStarted } = renderDialog();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Crawl all 19' }),
    );
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(17));
  });

  it('still counts as started when the response body is unreadable, and says so in a warning', async () => {
    mockGet.mockResolvedValue(estimate());
    mockFetch.mockResolvedValue({
      ok: true,
      status: 202,
      json: () => Promise.reject(new SyntaxError('Unexpected end of JSON')),
    });
    const { onStarted } = renderDialog();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Crawl all 19' }),
    );
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(null));
    expect(console.warn).toHaveBeenCalledWith(
      'CrawlAllDialog: could not read the crawl-all response',
      expect.objectContaining({ status: 202 }),
    );
  });

  it('shows Starting… and holds both buttons while the post is in flight', async () => {
    mockGet.mockResolvedValue(estimate());
    mockFetch.mockReturnValue(new Promise(() => undefined));
    const { onClose } = renderDialog();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Crawl all 19' }),
    );
    const starting = await screen.findByRole('button', { name: COPY.starting });
    expect(starting.hasAttribute('disabled')).toBe(true);
    expect(
      screen
        .getByRole('button', { name: COPY.cancel })
        .hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('says the crawl didn’t start when the post fails, and Try again posts again', async () => {
    mockGet.mockResolvedValue(estimate());
    mockFetch.mockResolvedValueOnce({ ok: false, status: 502 });
    mockFetch.mockResolvedValueOnce(queued());
    const { onStarted } = renderDialog();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Crawl all 19' }),
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(COPY.failedTitle);
    expect(alert.textContent).toContain(COPY.failedBody);
    // Desktop keeps 07/save-failed's gap and cross.
    expect(alert.style.gap).toBe('12px');
    expect(alert.querySelector('svg')?.getAttribute('stroke-width')).toBe('2');
    expect(onStarted).not.toHaveBeenCalled();
    // The confirm reads as it did before.
    expect(screen.getByRole('button', { name: 'Crawl all 19' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: TRY_AGAIN }));
    await waitFor(() => expect(onStarted).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('offers Try again when the estimate doesn’t load', async () => {
    mockGet.mockRejectedValueOnce(new Error('boom'));
    mockGet.mockResolvedValueOnce(estimate());
    renderDialog();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(COPY.estimateFailedTitle);
    expect(alert.textContent).toContain(COPY.estimateFailedBody);
    expect(
      screen
        .getByRole('button', { name: COPY.confirmLoading })
        .hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: TRY_AGAIN }));
    expect(
      await screen.findByRole('button', { name: 'Crawl all 19' }),
    ).toBeTruthy();
  });

  it('is a bottom sheet on the phone, with the same body', async () => {
    phone = true;
    mockGet.mockResolvedValue(estimate());
    renderDialog();
    expect(screen.getByTestId('admin-sheet')).toBeTruthy();
    const text = await body();
    expect(text).toContain('19 of 21 venues are queued now');
    expect(screen.getByRole('button', { name: 'Crawl all 19' })).toBeTruthy();
  });

  it('draws the phone failed toast as crawl-all-failed-m: gap 10, cross 2.2', async () => {
    phone = true;
    mockGet.mockResolvedValue(estimate());
    mockFetch.mockResolvedValue({ ok: false, status: 502 });
    renderDialog();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Crawl all 19' }),
    );
    const alert = await screen.findByRole('alert');
    expect(alert.style.gap).toBe('10px');
    expect(alert.style.padding).toBe('12px');
    expect(alert.querySelector('svg')?.getAttribute('stroke-width')).toBe(
      '2.2',
    );
  });

  it('draws Open Venues with AdminButton’s gradient', async () => {
    mockGet.mockResolvedValue(estimate({ eligible: 0 }));
    renderDialog();
    const link = await screen.findByRole('link', { name: COPY.openVenues });
    // The link sets no weight of its own, so the variant's 700 shows it
    // spread the shared style (jsdom may not keep var()-based colours).
    const gradient = adminButtonVariantStyle('gradient');
    expect(gradient.fontWeight).toBe(700);
    expect(link.style.fontWeight).toBe('700');
  });

  it('scrolls a long phone body on its own, so the buttons stay on screen', async () => {
    phone = true;
    mockGet.mockResolvedValue(estimate());
    renderDialog();
    const scroller = await screen.findByTestId('crawl-all-body');
    // The height cap is a calc() jsdom can't parse, so only the scroll is checked.
    expect(scroller.style.overflowY).toBe('auto');
  });

  it('names the next nightly in Mountain Time', async () => {
    mockGet.mockResolvedValue(
      estimate({ nextCrawlAt: '2026-11-15T09:07:00.000Z' }),
    );
    renderDialog();
    expect(
      await screen.findByText('Tonight’s 2:07 AM crawl still runs.'),
    ).toBeTruthy();
  });

  it.each([
    ['null', { nextCrawlAt: null }],
    ['missing', { nextCrawlAt: undefined }],
  ])(
    'drops the nightly line when the next crawl is %s',
    async (_label, over) => {
      mockGet.mockResolvedValue(estimate(over));
      renderDialog();
      await body();
      expect(screen.queryByText(/crawl still runs/)).toBeNull();
    },
  );

  it('shows a sub-cent usual cost to its own precision', async () => {
    mockGet.mockResolvedValue(
      estimate({ usual: { durationMs: 20 * 60000, costUsd: 0.0042 } }),
    );
    renderDialog();
    expect(await body()).toContain('cost about $0.0042.');
  });
});

describe('CrawlAllButton', () => {
  beforeEach(() => {
    phone = false;
    mockGet.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // Advancing on its own keeps waitFor and the fetch promises moving.
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const startCrawl = async () => {
    render(<CrawlAllButton />);
    fireEvent.click(screen.getByRole('button', { name: COPY.trigger }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Crawl all 19' }),
    );
  };

  it('sizes itself by the admin breakpoint in CSS, not by a JS media query', () => {
    // A JS phone flag that never resolves must not change the trigger.
    phone = null;
    render(<CrawlAllButton />);
    const trigger = screen.getByTestId('crawl-all-trigger');
    expect(trigger.className).toBe(TRIGGER_CLASS);
    expect(trigger.className).toContain('max-[720px]:w-full');
    expect(trigger.className).toContain('max-[720px]:h-10');
    // No inline size to beat the classes.
    expect(trigger.style.height).toBe('');
    expect(trigger.style.width).toBe('');
    expect(trigger.style.fontSize).toBe('');
  });

  it('opens the confirm', async () => {
    mockGet.mockResolvedValue(estimate());
    render(<CrawlAllButton />);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: COPY.trigger }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('reads Queued ✓, held, for 5 s after a start, then its label again', async () => {
    mockGet.mockResolvedValue(estimate());
    mockFetch.mockResolvedValue(queued());
    await startCrawl();
    const trigger = await screen.findByRole('button', { name: COPY.queued });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger.hasAttribute('disabled')).toBe(true);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const back = screen.getByRole('button', { name: COPY.trigger });
    expect(back.hasAttribute('disabled')).toBe(false);
  });

  it('names the real count when it differs from the one confirmed', async () => {
    mockGet.mockResolvedValue(estimate());
    mockFetch.mockResolvedValue(queued(17));
    await startCrawl();
    expect(
      await screen.findByRole('button', { name: COPY.queuedCount(17) }),
    ).toBeTruthy();
  });
});
