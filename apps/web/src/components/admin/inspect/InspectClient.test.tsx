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
import { INSPECT_CSP_META } from './inspect-rules';
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
    ).toBe('/admin/venues/venue-1/inspect/run-7');
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

  it('switches between Page, Text and HTML', async () => {
    mockGet.mockResolvedValue({ html: HTML });
    render(<InspectClient {...props()} />);
    await screen.findByTestId('inspect-html');
    const tabs = within(screen.getByTestId('inspect-tabs'));
    expect(tabs.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      COPY.tabs.page,
      COPY.tabs.text,
      COPY.tabs.html,
    ]);

    fireEvent.click(tabs.getByRole('tab', { name: COPY.tabs.text }));
    expect(screen.getByTestId('inspect-text').textContent).toBe('Tate McRae');
    expect(screen.queryByTestId('inspect-html')).toBeNull();

    fireEvent.click(tabs.getByRole('tab', { name: COPY.tabs.page }));
    const frame = screen.getByTestId('inspect-frame');
    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(frame.getAttribute('title')).toBe(
      COPY.frameTitle('ballarena.com/events'),
    );
    const srcdoc = frame.getAttribute('srcdoc') ?? '';
    expect(srcdoc.startsWith(`<!doctype html>${INSPECT_CSP_META}`)).toBe(true);
    expect(Reflect.get(window, '__inspectRan')).toBeUndefined();

    fireEvent.click(tabs.getByRole('tab', { name: COPY.tabs.html }));
    expect(screen.getByTestId('inspect-html')).toBeTruthy();
  });

  it('a feed run opens on Text and has no Page', async () => {
    mockGet.mockResolvedValue({ html: '<rss><item>Jelly Roll</item></rss>' });
    const feed = page({ fetchMode: 'api' });
    render(<InspectClient {...props({ pages: [feed], page: feed })} />);
    expect(await screen.findByTestId('inspect-text')).toBeTruthy();
    const tabs = within(screen.getByTestId('inspect-tabs'));
    expect(tabs.queryByRole('tab', { name: COPY.tabs.page })).toBeNull();
    expect(
      tabs
        .getByRole('tab', { name: COPY.tabs.text })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(screen.queryByTestId('inspect-frame')).toBeNull();
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

  it.each([
    ['expired', COPY.gone.expired],
    ['too_large', COPY.gone.tooLarge],
    ['not_stored', COPY.gone.notStored],
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
    mockGet.mockRejectedValue(notFound('not_stored'));
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

  it('a run with no pages says none were kept', () => {
    render(<InspectClient {...props({ pages: [], page: null })} />);
    expect(screen.getByTestId('inspect-pages-gone').textContent).toContain(
      ADMIN_COPY.runDetail.noPages,
    );
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
    expect(push).toHaveBeenCalledWith('/admin/venues/venue-1/inspect/run-7');

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
