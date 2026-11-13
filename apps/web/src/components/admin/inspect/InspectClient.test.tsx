// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from '@testing-library/react';
import type * as ApiModule from '@/lib/api';

const mockGet = vi.fn();
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof ApiModule>('@/lib/api');
  return {
    ...actual,
    apiClient: { get: (...args: unknown[]) => mockGet(...args) },
  };
});

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: () => Promise.resolve('test-token') }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

const setPageTrail = vi.fn();
vi.mock('@/components/admin/shell/PageTitleContext', () => ({
  usePageTitle: () => ({ setPageTrail }),
}));

import { ApiError } from '@/lib/api';
import { InspectClient, type InspectClientProps } from './InspectClient';
import type { RunPage, RunRow } from '@/components/admin/crawl-runs/run-data';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.inspect;

let phone = false;
const matchMediaStub = (query: string): MediaQueryList => ({
  matches: phone,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});

const RUN: RunRow = {
  id: 'run-9',
  status: 'partial',
  reason: null,
  eventsFound: 28,
  eventsInserted: 0,
  durationMs: 212000,
  llmCostUsd: 0.14,
  errorMessage: null,
  createdAt: '2026-11-09T10:02:00.000Z',
};

const page = (overrides: Partial<RunPage> = {}): RunPage => ({
  id: 'page-1',
  url: 'https://www.ballarena.com/events',
  finalUrl: null,
  httpStatus: 200,
  bytes: 2_000_000,
  fetchMode: 'browser',
  ...overrides,
});

const HTML =
  '<!doctype html><html><head></head><body><h1>Tate McRae</h1><script>window.__inspectRan = true;</script></body></html>';

const props = (
  overrides: Partial<InspectClientProps> = {},
): InspectClientProps => {
  const first = page();
  return {
    venue: {
      id: 'venue-1',
      name: 'Ball Arena',
      websiteUrl: 'https://www.ballarena.com',
      latestRunId: 'run-10',
    },
    run: RUN,
    pages: [first],
    page: first,
    compare: { id: 'run-7', at: '2026-11-07T10:01:00.000Z', eventsFound: 106 },
    ...overrides,
  };
};

const COMPARE_HREF = `/admin/venues/venue-1/inspect/run-7?url=${encodeURIComponent('https://www.ballarena.com/events')}`;

const notFound = (reason?: string) =>
  new ApiError(
    404,
    'No stored body for this page',
    undefined,
    undefined,
    reason,
  );

describe('InspectClient', () => {
  beforeEach(() => {
    phone = false;
    vi.stubGlobal('matchMedia', matchMediaStub);
    mockGet.mockReset();
    push.mockReset();
    refresh.mockReset();
    setPageTrail.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, '__inspectRan');
  });

  it('heads with Inspect · host+path, the chip and the run’s line', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    render(<InspectClient {...props()} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Inspect · ballarena.com/events',
    );
    expect(screen.getByTestId('inspect-line').textContent).toBe(
      'Ball Arena · run of Nov 9, 3:02 AM · 200 · 1.9 MB',
    );
    expect(
      screen.getByRole('link', { name: COPY.openLive }).getAttribute('href'),
    ).toBe('https://www.ballarena.com/events');
    expect(
      screen
        .getByRole('link', { name: 'Compare with Nov 7' })
        .getAttribute('href'),
    ).toBe(COMPARE_HREF);
    await screen.findByTestId('inspect-html');
  });

  it('Compare keeps the inspected page, by its URL', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    const second = page({
      id: 'page-2',
      url: 'https://www.ballarena.com/events?page=2',
    });
    render(
      <InspectClient {...props({ pages: [page(), second], page: second })} />,
    );
    expect(
      screen
        .getByRole('link', { name: 'Compare with Nov 7' })
        .getAttribute('href'),
    ).toBe(
      `/admin/venues/venue-1/inspect/run-7?url=${encodeURIComponent(second.url)}`,
    );
    await screen.findByTestId('inspect-html');
  });

  it('encodes the venue id in the breadcrumb', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    const base = props();
    render(<InspectClient {...base} venue={{ ...base.venue, id: 'a/b?c' }} />);
    expect(setPageTrail.mock.calls[0]?.[0]?.[0]).toEqual({
      label: 'Ball Arena',
      href: '/admin/venues/a%2Fb%3Fc',
    });
    await screen.findByTestId('inspect-html');
  });

  it('sets the breadcrumb trail: {Venue} / Runs / Inspect', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    render(<InspectClient {...props()} />);
    expect(setPageTrail).toHaveBeenCalledWith([
      { label: 'Ball Arena', href: '/admin/venues/venue-1' },
      {
        label: COPY.runsCrumb,
        href: '/admin/venues/venue-1?tab=runs&run=run-9',
      },
      { label: COPY.crumb },
    ]);
    await screen.findByTestId('inspect-html');
  });

  it('leaves Compare off without an earlier full run', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    render(<InspectClient {...props({ compare: null })} />);
    await screen.findByTestId('inspect-html');
    expect(screen.queryByRole('link', { name: /^Compare/ })).toBeNull();
  });

  it('fetches the page’s body and opens on HTML, as escaped text', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    render(<InspectClient {...props()} />);
    expect(screen.getByTestId('inspect-body-loading')).toBeTruthy();
    const pre = await screen.findByTestId('inspect-html');
    expect(mockGet).toHaveBeenCalledWith(
      '/v1/admin/crawl/pages/page-1/body',
      'test-token',
    );
    expect(pre.tagName).toBe('PRE');
    expect(pre.textContent).toBe(HTML);
    // Shown as text: nothing from the body became an element here.
    expect(pre.children).toHaveLength(0);
    expect(document.querySelector('script')).toBeNull();
    expect(Reflect.get(window, '__inspectRan')).toBeUndefined();
  });

  it('has Text and HTML only, and switches between them', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    render(<InspectClient {...props()} />);
    await screen.findByTestId('inspect-html');
    const tabs = within(screen.getByTestId('inspect-tabs'));
    expect(tabs.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      COPY.tabs.text,
      COPY.tabs.html,
    ]);
    expect(document.querySelector('iframe')).toBeNull();

    fireEvent.click(tabs.getByRole('tab', { name: COPY.tabs.text }));
    expect(screen.getByTestId('inspect-text').textContent).toBe('Tate McRae');
    expect(screen.queryByTestId('inspect-html')).toBeNull();

    fireEvent.click(tabs.getByRole('tab', { name: COPY.tabs.html }));
    expect(screen.getByTestId('inspect-html')).toBeTruthy();
  });

  it('never makes the body’s markup into elements, on either tab', async () => {
    const body = '<b>bold</b><script>alert(1)</script>';
    mockGet.mockResolvedValue({ html: body });
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<InspectClient {...props()} />);
    const pre = await screen.findByTestId('inspect-html');
    // The HTML tab shows the characters themselves.
    expect(pre.textContent).toBe(body);
    expect(pre.children).toHaveLength(0);
    expect(document.querySelector('b')).toBeNull();
    expect(document.querySelector('script')).toBeNull();

    const tabs = within(screen.getByTestId('inspect-tabs'));
    fireEvent.click(tabs.getByRole('tab', { name: COPY.tabs.text }));
    const text = screen.getByTestId('inspect-text');
    expect(text.textContent).toBe('bold');
    expect(text.textContent).not.toContain('alert');
    expect(text.children).toHaveLength(0);
    expect(document.querySelector('b')).toBeNull();
    expect(document.querySelector('script')).toBeNull();
    expect(alert).not.toHaveBeenCalled();
  });

  it('a feed run opens on Text', async () => {
    mockGet.mockResolvedValue({ html: '<rss><item>Jelly Roll</item></rss>' });
    const feed = page({ fetchMode: 'api' });
    render(<InspectClient {...props({ pages: [feed], page: feed })} />);
    expect(await screen.findByTestId('inspect-text')).toBeTruthy();
    const tabs = within(screen.getByTestId('inspect-tabs'));
    expect(
      tabs
        .getByRole('tab', { name: COPY.tabs.text })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('says where the run stopped, above the HTML', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    const first = page();
    const pages = [first, page({ id: 'page-2', httpStatus: 503 })];
    render(<InspectClient {...props({ pages, page: first })} />);
    expect(
      (await screen.findByTestId('inspect-stopped-here')).textContent,
    ).toBe(COPY.stoppedHere(2));
  });

  it('a later page with no status is not where the run stopped', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    const first = page();
    const pages = [
      first,
      page({ id: 'page-2', httpStatus: null }),
      page({ id: 'page-3', httpStatus: 404 }),
    ];
    render(<InspectClient {...props({ pages, page: first })} />);
    expect(
      (await screen.findByTestId('inspect-stopped-here')).textContent,
    ).toBe(COPY.stoppedHere(3));
  });

  it('a not_stored body offers the live page only, with the not-stored line', async () => {
    mockGet.mockRejectedValue(notFound('not_stored'));
    render(<InspectClient {...props()} />);
    const gone = await screen.findByTestId('inspect-pages-gone');
    expect(gone.textContent).toContain(COPY.gone.notStored);
    // No run keeps bodies while they aren't stored: no dead-end hop.
    expect(
      within(gone).queryByRole('link', { name: COPY.gone.latestRun }),
    ).toBeNull();
    expect(
      within(gone)
        .getByRole('link', { name: COPY.openLive })
        .getAttribute('href'),
    ).toBe('https://www.ballarena.com/events');
  });

  it.each([
    ['expired', COPY.gone.expired],
    ['too_large', COPY.gone.tooLarge],
  ])(
    'a %s body reads as pages gone, with its own line',
    async (reason, line) => {
      mockGet.mockRejectedValue(notFound(reason));
      render(<InspectClient {...props()} />);
      const gone = await screen.findByTestId('inspect-pages-gone');
      expect(gone.textContent).toContain(line);
      expect(
        within(gone)
          .getByRole('link', { name: COPY.gone.latestRun })
          .getAttribute('href'),
      ).toBe('/admin/venues/venue-1/inspect/run-10');
      expect(
        within(gone)
          .getByRole('link', { name: COPY.openLive })
          .getAttribute('href'),
      ).toBe('https://www.ballarena.com/events');
      expect(screen.queryByTestId('inspect-couldnt-load')).toBeNull();
    },
  );

  it('offers no latest run when this is the latest', async () => {
    mockGet.mockRejectedValue(notFound('expired'));
    const base = props();
    render(
      <InspectClient
        {...base}
        venue={{ ...base.venue, latestRunId: 'run-9' }}
      />,
    );
    const gone = await screen.findByTestId('inspect-pages-gone');
    expect(
      within(gone).queryByRole('link', { name: COPY.gone.latestRun }),
    ).toBeNull();
  });

  it('a run with no pages says none were kept, and offers the latest run', () => {
    render(<InspectClient {...props({ pages: [], page: null })} />);
    const gone = screen.getByTestId('inspect-pages-gone');
    expect(gone.textContent).toContain(ADMIN_COPY.runDetail.noPages);
    expect(
      within(gone).getByRole('link', { name: COPY.gone.latestRun }),
    ).toBeTruthy();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('a 500 is Couldn’t load, and Try again asks again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGet.mockRejectedValueOnce(new ApiError(500, 'unreadable'));
    render(<InspectClient {...props()} />);
    const failed = await screen.findByTestId('inspect-couldnt-load');
    expect(
      within(failed).getByRole('link', { name: COPY.openLive }),
    ).toBeTruthy();
    mockGet.mockResolvedValueOnce({ html: HTML });
    fireEvent.click(
      within(failed).getByRole('button', { name: COPY.couldntLoad.tryAgain }),
    );
    expect(await screen.findByTestId('inspect-html')).toBeTruthy();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('a network failure is Couldn’t load too', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGet.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<InspectClient {...props()} />);
    expect(await screen.findByTestId('inspect-couldnt-load')).toBeTruthy();
  });

  it('pages that couldn’t load offer Try again, which refreshes the route', () => {
    render(<InspectClient {...props({ pages: null, page: null })} />);
    fireEvent.click(
      screen.getByRole('button', { name: COPY.couldntLoad.tryAgain }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('on the phone, both actions move into ⋯ under the back link', async () => {
    phone = true;
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    mockGet.mockResolvedValue({ html: HTML });
    render(<InspectClient {...props()} />);
    await screen.findByTestId('inspect-html');
    expect(
      screen
        .getByRole('link', { name: COPY.back('Ball Arena') })
        .getAttribute('href'),
    ).toBe('/admin/venues/venue-1?tab=runs&run=run-9');
    expect(screen.queryByRole('link', { name: COPY.openLive })).toBeNull();
    expect(screen.queryByRole('link', { name: /^Compare/ })).toBeNull();
    expect(screen.getByTestId('inspect-line').textContent).toBe(
      'Run of Nov 9, 3:02 AM · 200 · 1.9 MB',
    );

    fireEvent.click(screen.getByTestId('inspect-menu'));
    expect(
      screen.getByText(COPY.openLiveHint('ballarena.com/events')),
    ).toBeTruthy();
    fireEvent.click(screen.getByTestId('inspect-menu-compare'));
    expect(push).toHaveBeenCalledWith(COMPARE_HREF);

    fireEvent.click(screen.getByTestId('inspect-menu'));
    fireEvent.click(screen.getByTestId('inspect-menu-live'));
    expect(open).toHaveBeenCalledWith(
      'https://www.ballarena.com/events',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('on the phone, the menu has no Compare without an earlier full run', async () => {
    phone = true;
    mockGet.mockResolvedValue({ html: HTML });
    render(<InspectClient {...props({ compare: null })} />);
    await screen.findByTestId('inspect-html');
    fireEvent.click(screen.getByTestId('inspect-menu'));
    expect(screen.getByTestId('inspect-menu-live')).toBeTruthy();
    expect(screen.queryByTestId('inspect-menu-compare')).toBeNull();
  });
});
