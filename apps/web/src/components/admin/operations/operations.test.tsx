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
import type { AuditLogItem } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { mtTodayWindow } from '@/components/admin/health/health-model';
import { KNOWN_ACTIONS, sentenceFor } from './activity-sentences';
import { OperationsClient } from './OperationsClient';

// P47-19 PR 2: Operations' shell and the Activity log (`07/activity-log*`).

// One getToken for every render, as Clerk's is: a fresh one would re-run the
// log's load effect on every render.
const auth = vi.hoisted(() => ({ getToken: async () => 'token' }));
vi.mock('@clerk/nextjs', () => ({ useAuth: () => auth }));
// The tab lives in the URL: `replace` writes the search, `useSearchParams`
// reads it back and re-renders, as the app router does.
const nav = vi.hoisted(() => ({
  search: '',
  listeners: new Set<() => void>(),
}));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => {
    nav.listeners.add(listener);
    return () => {
      nav.listeners.delete(listener);
    };
  };
  const read = () => nav.search;
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: (href: string) => {
        nav.search = new URL(href, 'http://localhost').search;
        nav.listeners.forEach((listener) => listener());
      },
      refresh: vi.fn(),
    }),
    useSearchParams: () =>
      new URLSearchParams(useSyncExternalStore(subscribe, read, read)),
  };
});

const COPY = ADMIN_COPY.operations;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const item = (over: Partial<AuditLogItem> = {}): AuditLogItem => ({
  id: 'a1',
  actor: 'hugh',
  actorKind: 'admin',
  actorAvatar: { avatarColor: null, avatarSecondColor: null },
  action: 'invite_code.revoke',
  area: 'people',
  targetId: 'c1',
  target: {
    kind: 'invite-code',
    name: 'SHARED1',
    href: '/admin/people/invite-codes?code=c1',
  },
  metadata: null,
  createdAt: '2026-11-14T16:12:00Z',
  ...over,
});

let logPage: (url: URL, init?: RequestInit) => Response | Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;
const logCalls = () =>
  fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname === '/v1/admin/audit-log');

const setPhone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

beforeEach(() => {
  setPhone(false);
  nav.search = '';
  logPage = () => json({ success: true, data: [item()], nextCursor: null });
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname === '/v1/admin/audit-log') return logPage(url, init);
    return json({ success: true, data: [] });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const renderLog = () => {
  nav.search = '?tab=log';
  return render(<OperationsClient />);
};

/** A page of `count` rows, ids prefixed by `page`. */
const rowsPage = (page: number, count: number, nextCursor: string | null) =>
  json({
    success: true,
    data: Array.from({ length: count }, (_, i) =>
      item({ id: `r${page}-${i}` }),
    ),
    nextCursor,
  });

// The Feedback tab's count and inbox are OperationsClient.test.tsx's.
describe('Operations shell', () => {
  it('draws Feedback, Emails and Activity log', () => {
    render(<OperationsClient />);
    expect(
      screen.getByRole('heading', { level: 1, name: COPY.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.subtitle)).toBeInTheDocument();
    const tabs = within(screen.getByTestId('operations-tabs')).getAllByRole(
      'tab',
    );
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Feedback',
      'Emails',
      'Activity log',
    ]);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to the Activity log', async () => {
    render(<OperationsClient />);
    fireEvent.click(screen.getByRole('tab', { name: COPY.tabs.log }));
    expect(await screen.findByTestId('activity-log-table')).toBeInTheDocument();
    expect(nav.search).toBe('?tab=log');
  });

  // The tab is the URL's, so a quick double switch lands on the last one.
  it('lands on the last tab of a quick double switch', async () => {
    render(<OperationsClient />);
    fireEvent.click(screen.getByRole('tab', { name: COPY.tabs.log }));
    fireEvent.click(screen.getByRole('tab', { name: COPY.tabs.feedback }));
    await waitFor(() =>
      expect(
        screen.getByRole('tab', { name: COPY.tabs.feedback }),
      ).toHaveAttribute('aria-selected', 'true'),
    );
    expect(screen.queryByTestId('activity-log-table')).not.toBeInTheDocument();
  });
});

describe('Activity log', () => {
  it("reads today's Mountain Time day, a page of 50 at a time", async () => {
    renderLog();
    await screen.findByTestId('activity-log-table');
    const [call] = logCalls();
    const day = mtTodayWindow(new Date());
    expect(call?.searchParams.get('since')).toBe(
      new Date(day.start).toISOString(),
    );
    expect(call?.searchParams.get('until')).toBe(
      new Date(day.end).toISOString(),
    );
    expect(call?.searchParams.get('limit')).toBe('50');
    const midnight = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(day.start));
    expect(midnight).toBe('00:00');
  });

  // README §37: a day past 50 changes gets Load more before its end line.
  it('reads the next page on Load more, then ends the day', async () => {
    let page = 0;
    logPage = () => {
      page += 1;
      return rowsPage(
        page,
        page === 1 ? 50 : 3,
        page === 1 ? 'cursor-1' : null,
      );
    };
    renderLog();
    await waitFor(() =>
      expect(screen.getAllByTestId('activity-log-row')).toHaveLength(50),
    );
    expect(logCalls()).toHaveLength(1);
    // The day isn't over yet, so its standing footer waits.
    expect(screen.queryByText(COPY.log.footer)).not.toBeInTheDocument();
    fireEvent.click(
      within(screen.getByTestId('activity-log-load-more')).getByRole('button'),
    );
    await waitFor(() =>
      expect(screen.getAllByTestId('activity-log-row')).toHaveLength(53),
    );
    expect(logCalls()[1]?.searchParams.get('cursor')).toBe('cursor-1');
    expect(
      within(screen.getByTestId('activity-log-load-more')).queryByRole(
        'button',
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText(COPY.log.footer)).toBeInTheDocument();
  });

  it('keeps the rows shown when Load more fails, and offers Try again', async () => {
    let page = 0;
    logPage = () => {
      page += 1;
      return page === 1
        ? rowsPage(page, 50, 'cursor-1')
        : json({ success: false }, 500);
    };
    renderLog();
    const more = await screen.findByTestId('activity-log-load-more');
    fireEvent.click(within(more).getByRole('button'));
    expect(await within(more).findByRole('alert')).toHaveTextContent(
      COPY.log.loadMoreFailed,
    );
    expect(screen.getAllByTestId('activity-log-row')).toHaveLength(50);
    expect(screen.queryByTestId('couldnt-load')).not.toBeInTheDocument();
  });

  it('ends the day at an empty page, even one with a cursor', async () => {
    logPage = () => json({ success: true, data: [], nextCursor: 'again' });
    renderLog();
    expect(await screen.findByTestId('activity-log-empty')).toBeInTheDocument();
    expect(logCalls()).toHaveLength(1);
    expect(
      screen.queryByTestId('activity-log-load-more'),
    ).not.toBeInTheDocument();
  });

  it('aborts the read on unmount, silently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let pending: AbortSignal | null = null;
    logPage = (_url, init) => {
      const signal = init?.signal ?? null;
      pending = signal;
      // As fetch does: a request rejects with an AbortError when aborted.
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    };
    const { unmount } = renderLog();
    await waitFor(() => expect(pending).not.toBeNull());
    unmount();
    expect(pending).toHaveProperty('aborted', true);
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
  });

  it('reads the new day when the tab comes back after midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T18:00:00Z'));
    renderLog();
    await screen.findByTestId('activity-log-table');
    // Back the same day: nothing to read.
    fireEvent(document, new Event('visibilitychange'));
    expect(logCalls()).toHaveLength(1);

    vi.setSystemTime(new Date('2026-11-15T18:00:00Z'));
    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(logCalls()).toHaveLength(2));
    expect(logCalls()[1]?.searchParams.get('since')).toBe(
      '2026-11-15T07:00:00.000Z',
    );
    expect(await screen.findByTestId('activity-log-table')).toBeInTheDocument();
  });

  it('draws the desktop log as a table', async () => {
    renderLog();
    const table = await screen.findByRole('table', { name: COPY.tabs.log });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
    // The header row and one row.
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getAllByRole('cell')).toHaveLength(4);
  });

  // `37/log-day-picker-d` draws Anyone and Any page idle: nothing picked, so
  // the log reads everyone, every page.
  it('draws Anyone and Any page idle, then the day stepper', async () => {
    renderLog();
    await screen.findByTestId('activity-log-table');
    expect(screen.getByTestId('activity-log-anyone-chip')).toHaveTextContent(
      COPY.log.anyone,
    );
    expect(screen.getByTestId('activity-log-any-page-chip')).toHaveTextContent(
      COPY.log.anyPage,
    );
    expect(screen.getByTestId('activity-log-day-chip')).toHaveTextContent(
      COPY.log.today,
    );
    expect(
      screen.getByRole('button', { name: COPY.log.nextDay }),
    ).toBeDisabled();
    expect(logCalls().at(-1)?.searchParams.has('actorHandle')).toBe(false);
    expect(logCalls().at(-1)?.searchParams.has('area')).toBe(false);
  });

  describe('Anyone and Any page', () => {
    const actorsBody = (count: number) =>
      json({
        success: true,
        data: [
          {
            handle: 'hugh',
            avatarColor: 'warning',
            avatarSecondColor: 'success',
            count: 31,
            you: true,
            role: 'admin',
          },
          {
            handle: 'jules',
            avatarColor: null,
            avatarSecondColor: null,
            count: 8,
            you: false,
            role: 'sub_admin',
          },
          ...Array.from({ length: count }, (_, i) => ({
            handle: `staff${i}`,
            avatarColor: null,
            avatarSecondColor: null,
            count: 0,
            you: false,
            role: i === 0 ? null : 'admin',
          })),
        ],
      });
    let extraStaff = 0;
    const actorCalls = () =>
      fetchMock.mock.calls
        .map(([input]) => new URL(String(input)))
        .filter((url) => url.pathname === '/v1/admin/audit-log/actors');

    beforeEach(() => {
      extraStaff = 0;
      fetchMock.mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = new URL(String(input));
          if (url.pathname === '/v1/admin/audit-log/actors')
            return actorsBody(extraStaff);
          if (url.pathname === '/v1/admin/audit-log') return logPage(url, init);
          return json({ success: true, data: [] });
        },
      );
    });

    it("lists every admin with the day's count, you first, and filters to one", async () => {
      renderLog();
      await screen.findByTestId('activity-log-table');
      fireEvent.click(screen.getByTestId('activity-log-anyone-chip'));
      const menu = await screen.findByTestId('activity-log-anyone');
      const hugh = await within(menu).findByRole('button', { name: '@hugh' });
      expect(hugh).toHaveTextContent(
        COPY.log.personLine('31 today', true, false),
      );
      // The visible count is also the row's description.
      expect(hugh).toHaveAccessibleDescription(
        COPY.log.personLine('31 today', true, false),
      );
      // A sub-admin says so (`37/log-filter-menus`).
      expect(
        within(menu).getByRole('button', { name: '@jules' }),
      ).toHaveAccessibleDescription('Sub-admin · 8 today');
      expect(menu).toHaveTextContent(COPY.log.anyoneNote);
      // Eight people or fewer: no search.
      expect(within(menu).queryByRole('searchbox')).not.toBeInTheDocument();

      fireEvent.click(within(menu).getByRole('button', { name: '@jules' }));
      expect(
        screen.queryByTestId('activity-log-anyone'),
      ).not.toBeInTheDocument();
      // The pick hands focus back to its chip.
      expect(screen.getByTestId('activity-log-anyone-chip')).toHaveFocus();
      await waitFor(() =>
        expect(logCalls().at(-1)?.searchParams.get('actorHandle')).toBe(
          'jules',
        ),
      );
      const chip = screen.getByTestId('activity-log-anyone-chip');
      expect(chip).toHaveTextContent('@jules');
      expect(chip).toHaveAccessibleName(COPY.log.pickedActor('jules'));

      fireEvent.click(screen.getByTestId('activity-log-anyone-clear'));
      await waitFor(() =>
        expect(logCalls().at(-1)?.searchParams.has('actorHandle')).toBe(false),
      );
    });

    it('offers a search once there are more than eight people', async () => {
      extraStaff = 7;
      renderLog();
      await screen.findByTestId('activity-log-table');
      fireEvent.click(screen.getByTestId('activity-log-anyone-chip'));
      const menu = await screen.findByTestId('activity-log-anyone');
      const search = await within(menu).findByRole('searchbox', {
        name: COPY.log.findAdmin,
      });
      fireEvent.change(search, { target: { value: '@jul' } });
      expect(
        within(menu).getByRole('button', { name: '@jules' }),
      ).toBeInTheDocument();
      expect(
        within(menu).queryByRole('button', { name: '@hugh' }),
      ).not.toBeInTheDocument();
    });

    it('says the list failed when a person comes back with an unknown role', async () => {
      fetchMock.mockImplementation(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = new URL(String(input));
          if (url.pathname === '/v1/admin/audit-log/actors')
            return json({
              success: true,
              data: [
                {
                  handle: 'hugh',
                  avatarColor: null,
                  avatarSecondColor: null,
                  count: 1,
                  you: true,
                  role: 'owner',
                },
              ],
            });
          if (url.pathname === '/v1/admin/audit-log') return logPage(url, init);
          return json({ success: true, data: [] });
        },
      );
      renderLog();
      await screen.findByTestId('activity-log-table');
      fireEvent.click(screen.getByTestId('activity-log-anyone-chip'));
      const menu = await screen.findByTestId('activity-log-anyone');
      expect(await within(menu).findByRole('alert')).toBeInTheDocument();
    });

    it('searches the log once typing pauses, with the matched sentences, beside the other filters', async () => {
      renderLog();
      await screen.findByTestId('activity-log-table');
      const field = screen.getByRole('searchbox', { name: COPY.log.search });
      // The API takes at most 100 characters.
      expect(field).toHaveAttribute('maxlength', '100');
      fireEvent.change(field, { target: { value: '  blocking ' } });
      await waitFor(() =>
        expect(logCalls().at(-1)?.searchParams.get('search')).toBe('blocking'),
      );
      const params = logCalls().at(-1)?.searchParams;
      expect(params?.get('actions')).toBe('venue.crawl_blocked');
      // The day is still the window it was; search narrows within it.
      expect(params?.has('since')).toBe(true);
      // The Anyone counts take the search, so a count matches its rows.
      await waitFor(() =>
        expect(actorCalls().at(-1)?.searchParams.get('search')).toBe(
          'blocking',
        ),
      );

      // Words no sentence holds still search the rows, with no actions.
      fireEvent.change(field, { target: { value: 'zzqx' } });
      await waitFor(() =>
        expect(logCalls().at(-1)?.searchParams.get('search')).toBe('zzqx'),
      );
      expect(logCalls().at(-1)?.searchParams.has('actions')).toBe(false);

      // Cleared, the log reads everything again.
      fireEvent.change(field, { target: { value: '' } });
      await waitFor(() =>
        expect(logCalls().at(-1)?.searchParams.has('search')).toBe(false),
      );
    });

    it("lists the sidebar's pages in its order and filters to one", async () => {
      renderLog();
      await screen.findByTestId('activity-log-table');
      fireEvent.click(screen.getByTestId('activity-log-any-page-chip'));
      const menu = await screen.findByTestId('activity-log-any-page');
      const names = within(menu)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label'));
      expect(names).toEqual([
        COPY.log.anyPage,
        'Needs you',
        'Health',
        'Venues',
        'Events',
        'Artists',
        'Prices',
        'People',
        'Feature flags',
        'Crawl runs',
        'Operations',
      ]);
      fireEvent.click(within(menu).getByRole('button', { name: 'Prices' }));
      await waitFor(() =>
        expect(logCalls().at(-1)?.searchParams.get('area')).toBe('prices'),
      );
      // The counts follow the page.
      await waitFor(() =>
        expect(actorCalls().at(-1)?.searchParams.get('area')).toBe('prices'),
      );
      expect(
        screen.getByTestId('activity-log-any-page-chip'),
      ).toHaveTextContent('Prices');
      // The month's dots follow the page too.
      fireEvent.click(screen.getByTestId('activity-log-day-chip'));
      await waitFor(() => {
        const days = fetchMock.mock.calls
          .map(([input]) => new URL(String(input)))
          .filter((url) => url.pathname === '/v1/admin/audit-log/days');
        expect(days.at(-1)?.searchParams.get('area')).toBe('prices');
      });
    });

    it('opens Anyone as a sheet on the phone, drawn without counts', async () => {
      setPhone(true);
      renderLog();
      await screen.findAllByTestId('activity-log-card');
      fireEvent.click(screen.getByTestId('activity-log-anyone-chip'));
      const sheet = await screen.findByRole('dialog', {
        name: COPY.log.whoSheet,
      });
      const hugh = await within(sheet).findByRole('button', { name: '@hugh' });
      expect(hugh).not.toHaveTextContent('today');
      expect(sheet).not.toHaveTextContent(COPY.log.anyoneNote);
    });
  });

  it('steps back a day, ends it with the days either side, and comes back', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T18:00:00Z'));
    renderLog();
    await screen.findByTestId('activity-log-table');
    fireEvent.click(screen.getByRole('button', { name: COPY.log.previousDay }));
    await waitFor(() => expect(logCalls()).toHaveLength(2));
    expect(logCalls()[1]?.searchParams.get('since')).toBe(
      '2026-11-13T07:00:00.000Z',
    );
    expect(screen.getByTestId('activity-log-day-chip')).toHaveTextContent(
      'Fri, Nov 13',
    );
    const end = await screen.findByTestId('activity-log-day-end');
    expect(end).toHaveTextContent(COPY.log.dayEnd('Fri, Nov 13'));
    expect(within(end).getByRole('button', { name: '‹ Thu, Nov 12' }));
    expect(screen.queryByText(COPY.log.footer)).not.toBeInTheDocument();
    // The day after is today, so its link says so.
    fireEvent.click(
      within(end).getByRole('button', { name: `${COPY.log.today} ›` }),
    );
    await waitFor(() => expect(logCalls()).toHaveLength(3));
    expect(logCalls()[2]?.searchParams.get('since')).toBe(
      '2026-11-14T07:00:00.000Z',
    );
  });

  it('opens the month with dots, bars the future, and Today comes back', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T18:00:00Z'));
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/v1/admin/audit-log/days')
        return json({ success: true, data: ['2026-11-02', '2026-11-10'] });
      if (url.pathname === '/v1/admin/audit-log') return logPage(url);
      return json({ success: true, data: [] });
    });
    renderLog();
    await screen.findByTestId('activity-log-table');
    fireEvent.click(screen.getByTestId('activity-log-day-chip'));
    const month = screen.getByRole('dialog', { name: 'November 2026' });
    await waitFor(() =>
      expect(within(month).getAllByTestId('activity-log-dot')).toHaveLength(2),
    );
    const days = fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .find((url) => url.pathname === '/v1/admin/audit-log/days');
    expect(days?.searchParams.get('month')).toBe('2026-11');
    expect(
      within(month).getByRole('button', { name: 'Sun, Nov 15, 2026' }),
    ).toBeDisabled();
    expect(
      within(month).getByRole('button', { name: COPY.log.nextMonth }),
    ).toBeDisabled();
    // The chosen day takes focus, inside the trapped popover.
    expect(
      within(month).getByRole('button', { name: 'Sat, Nov 14, 2026' }),
    ).toHaveFocus();
    fireEvent.click(
      within(month).getByRole('button', { name: 'Tue, Nov 10, 2026' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(logCalls().at(-1)?.searchParams.get('since')).toBe(
        '2026-11-10T07:00:00.000Z',
      ),
    );
    fireEvent.click(screen.getByTestId('activity-log-day-chip'));
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: COPY.log.today,
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('activity-log-day-chip')).toHaveTextContent(
        COPY.log.today,
      ),
    );
  });

  it('closes the month on Escape, back to the chip', async () => {
    renderLog();
    await screen.findByTestId('activity-log-table');
    const chip = screen.getByTestId('activity-log-day-chip');
    fireEvent.click(chip);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(chip).toHaveFocus();
  });

  it('closes the month on an outside press, but the chip only toggles it', async () => {
    renderLog();
    await screen.findByTestId('activity-log-table');
    const chip = screen.getByTestId('activity-log-day-chip');
    fireEvent.click(chip);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // A press on the chip itself is its own click's to handle: closing on the
    // press too would reopen the month on the click that follows.
    fireEvent.click(chip);
    fireEvent.pointerDown(chip);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(chip);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // #24: each admin in their own colours.
  it("draws the actor's avatar in their own colours", async () => {
    logPage = () =>
      json({
        success: true,
        data: [
          item({
            actorAvatar: {
              avatarColor: 'warning',
              avatarSecondColor: 'success',
            },
          }),
        ],
        nextCursor: null,
      });
    renderLog();
    const row = (await screen.findAllByTestId('activity-log-row'))[0];
    if (!row) throw new Error('no row');
    const avatar = within(row).getByTestId('person-avatar');
    expect(avatar).toHaveAttribute('data-avatar-first', 'warning');
    expect(avatar).toHaveAttribute('data-avatar-second', 'success');
  });

  it('draws the row and links WHAT to the thing it changed', async () => {
    renderLog();
    const row = (await screen.findAllByTestId('activity-log-row'))[0];
    if (!row) throw new Error('no row');
    expect(row).toHaveTextContent('@hugh');
    expect(row).toHaveTextContent('Revoked invite code SHARED1');
    expect(row).toHaveTextContent('People');
    expect(within(row).getByRole('link')).toHaveAttribute(
      'href',
      '/admin/people/invite-codes?code=c1',
    );
    expect(screen.getByText(COPY.log.footer)).toBeInTheDocument();
  });

  it('shows the empty day, pointing at another day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T18:00:00Z'));
    logPage = () => json({ success: true, data: [], nextCursor: null });
    renderLog();
    const empty = await screen.findByTestId('activity-log-empty');
    expect(empty).toHaveTextContent(COPY.log.emptyTitle);
    expect(empty).toHaveTextContent(COPY.log.emptyBody);
    fireEvent.click(screen.getByRole('button', { name: COPY.log.previousDay }));
    await waitFor(() =>
      expect(screen.getByTestId('activity-log-empty')).toHaveTextContent(
        COPY.log.emptyDayTitle('Fri, Nov 13'),
      ),
    );
  });

  it("falls into Couldn't load", async () => {
    logPage = () => json({ success: false }, 500);
    renderLog();
    expect(await screen.findByTestId('couldnt-load')).toBeInTheDocument();
  });

  it('picks a day from the OS date picker on the phone, then ends it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T18:00:00Z'));
    setPhone(true);
    renderLog();
    await screen.findAllByTestId('activity-log-card');
    const input = screen.getByTestId('activity-log-day-input');
    expect(input).toHaveAttribute('max', '2026-11-14');
    // A typed future day is ignored, as the OS picker would bar it.
    fireEvent.change(input, { target: { value: '2026-11-20' } });
    expect(logCalls()).toHaveLength(1);
    fireEvent.change(input, { target: { value: '2026-11-10' } });
    await waitFor(() => expect(logCalls()).toHaveLength(2));
    expect(logCalls()[1]?.searchParams.get('since')).toBe(
      '2026-11-10T07:00:00.000Z',
    );
    const end = await screen.findByTestId('activity-log-day-end');
    expect(end).toHaveTextContent(COPY.log.dayEnd('Nov 10'));
    fireEvent.click(within(end).getByRole('button', { name: '‹ Nov 9' }));
    await waitFor(() =>
      expect(logCalls().at(-1)?.searchParams.get('since')).toBe(
        '2026-11-09T07:00:00.000Z',
      ),
    );
  });

  it('draws cards on the phone: sentence, then handle, time and page', async () => {
    setPhone(true);
    renderLog();
    const card = (await screen.findAllByTestId('activity-log-card'))[0];
    expect(card).toHaveTextContent('Revoked invite code SHARED1');
    expect(card).toHaveTextContent(/@hugh · \d{1,2}:\d{2} [AP]M · People/);
    // `37/log-m`: Anyone and Any page under the stepper.
    expect(screen.getByTestId('activity-log-anyone-chip')).toBeInTheDocument();
    expect(
      screen.getByTestId('activity-log-any-page-chip'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: COPY.log.nextDay }),
    ).toBeDisabled();
    expect(
      screen.queryByTestId('activity-log-day-end'),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId('operations-tabs')).getByRole('tab', {
        name: 'Log',
      }),
    ).toBeInTheDocument();
  });
});

// Every action key an audit writer records (apps/api, packages, crawler).
const WRITTEN_ACTIONS = [
  'artist.match.update',
  'artist.match.confirm_auto',
  'artist.match.auto',
  'artist.name.update',
  'artist.name.unlock',
  'artist.name.lock',
  'artist.reports.dismiss',
  'artist.visibility.update',
  'contest.resolve',
  'contest.defer',
  'crawl.daily_cron',
  'crawl.trigger',
  'crawl.trigger_all',
  'crawl.trigger_test',
  'crawl.trigger_trial',
  'event.auto_cancel.stale',
  'event.bulk_auto_approve',
  'event.bulk_delete',
  'event.bulk_mark_as_concert',
  'event.bulk_mark_non_concert',
  'event.bulk_unverify',
  'event.create',
  'event.delete',
  'event.drift_duplicates_merged',
  'event.fill_from_merge',
  'event.lineup.update',
  'event.merge',
  'event.report.resolve',
  'event.sold_out.mark',
  'event.sold_out.clear',
  'event.update',
  'event.venue.correct',
  'event.venue.move',
  'event.verify',
  'feature_flag.toggle',
  'feedback.update',
  'invite_code.create',
  'invite_code.edit',
  'invite_code.reactivate',
  'invite_code.revoke',
  'needs_you.answer',
  'needs_you.undo',
  'needs_you.snooze',
  'needs_you.unsnooze',
  'notification.test_email',
  'price.promoted',
  'price.pipeline.run',
  'price.submission.admin_add',
  'price.submission.replace_listed',
  'price.submission.edit_price',
  'price.submission.reject',
  'price.submission.update',
  'price.settings.update',
  'settings.update',
  'user.email_shown',
  'user.role.update',
  'user.seeded',
  'user.sessions_revoked',
  'user.test_account.set',
  'venue.create',
  'venue.update',
  'venue.delete',
  'venue.remove',
  'venue.hide',
  'venue.show',
  'venue.crawl_pause',
  'venue.crawl_resume',
  'venue.crawl_auto_paused',
  'venue.crawl_auto_resumed',
  'venue.crawl_blocked',
  'venue.fault.acknowledge',
  'venue.fault.unacknowledge',
  'venue.guide.save',
  'venue.guide.publish',
  'venue.guide.unpublish',
  'venue.guide.draft',
  'venue.platform_changed',
  'venue.platform_probe',
];

describe('sentences', () => {
  it.each(WRITTEN_ACTIONS)('%s has a sentence of its own', (action) => {
    expect(KNOWN_ACTIONS).toContain(action);
  });

  it('has no sentence for a key nothing writes', () => {
    expect([...KNOWN_ACTIONS].sort()).toEqual([...WRITTEN_ACTIONS].sort());
  });

  // The settings a `settings.update` row keeps, as the API audits them.
  const SETTINGS = {
    llmMonthlyBudgetUsd: 25,
    llmBudgetWarnAtPercent: 75,
    llmBudgetFallbackToStructured: false,
    approvePricesMyself: false,
  };

  const words = (over: Partial<AuditLogItem>) => {
    const { lead, name, tail } = sentenceFor(item(over));
    return `${lead}${name ?? ''}${tail}`;
  };

  it.each<[Partial<AuditLogItem>, string]>([
    [{}, 'Revoked invite code SHARED1'],
    [
      {
        action: 'venue.crawl_pause',
        target: { kind: 'venue', name: 'Levitt Pavilion', href: null },
        metadata: { resumeOn: '2027-04-01' },
      },
      'Paused crawling Levitt Pavilion until Apr 1',
    ],
    [
      {
        action: 'feature_flag.toggle',
        target: { kind: 'feature-flag', name: 'Crews', href: null },
        metadata: { enabled: true },
      },
      'Turned Crews on',
    ],
    [
      {
        action: 'price.submission.edit_price',
        target: { kind: 'price', name: 'Vince Staples', href: null },
        metadata: { after: { priceMin: 50, priceMax: 450 } },
      },
      'Changed a price for Vince Staples: $50–$450',
    ],
    [
      { action: 'crawl.trigger_all', target: null },
      'Queued a crawl of all venues',
    ],
    [
      {
        action: 'crawl.trigger',
        target: { kind: 'venue', name: 'Levitt Pavilion', href: null },
      },
      'Queued a crawl of Levitt Pavilion',
    ],
    [
      {
        action: 'artist.name.unlock',
        target: { kind: 'artist', name: 'Wilco', href: null },
      },
      'Unlocked the name of Wilco',
    ],
    // price.settings.update (a save of only the Prices toggle) reads where the
    // toggle ended up, even on a repeat tap that changed nothing.
    [
      {
        action: 'price.settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: {
          before: { ...SETTINGS, approvePricesMyself: true },
          after: { ...SETTINGS, approvePricesMyself: true },
        },
      },
      'Turned Approve every price myself on',
    ],
    [
      {
        action: 'price.settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: {
          before: { ...SETTINGS, approvePricesMyself: true },
          after: { ...SETTINGS, approvePricesMyself: false },
        },
      },
      'Turned Approve every price myself off',
    ],
    [
      {
        action: 'price.settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: null,
      },
      'Changed the price settings',
    ],
    // settings.update reads the fields its before and after differ in.
    [
      {
        action: 'settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: {
          before: { ...SETTINGS, llmMonthlyBudgetUsd: 25 },
          after: { ...SETTINGS, llmMonthlyBudgetUsd: 40 },
        },
      },
      'Changed the LLM budget',
    ],
    [
      {
        action: 'settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: {
          before: SETTINGS,
          after: {
            ...SETTINGS,
            llmBudgetWarnAtPercent: 90,
            llmBudgetFallbackToStructured: true,
          },
        },
      },
      'Changed the LLM budget',
    ],
    [
      {
        action: 'settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: {
          before: SETTINGS,
          after: { ...SETTINGS, approvePricesMyself: true },
        },
      },
      'Turned Approve every price myself on',
    ],
    [
      {
        action: 'settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: {
          before: { ...SETTINGS, approvePricesMyself: true },
          after: SETTINGS,
        },
      },
      'Turned Approve every price myself off',
    ],
    // A mix, a save that changed nothing, or a row without the two.
    [
      {
        action: 'settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: {
          before: SETTINGS,
          after: {
            ...SETTINGS,
            llmMonthlyBudgetUsd: 40,
            approvePricesMyself: true,
          },
        },
      },
      'Changed the admin settings',
    ],
    [
      {
        action: 'settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: { before: SETTINGS, after: SETTINGS },
      },
      'Changed the admin settings',
    ],
    [
      {
        action: 'settings.update',
        targetId: 'admin_settings',
        target: null,
        metadata: null,
      },
      'Changed the admin settings',
    ],
    [
      { target: { kind: 'invite-code', name: null, href: null } },
      'Revoked invite code (deleted)',
    ],
    [{ action: 'venue.new_thing', target: null }, 'Venue new thing'],
    // A target the API could not resolve keeps the name slot filled.
    [
      { action: 'venue.update', targetId: 'v1', target: null },
      'Edited (deleted)',
    ],
    [{ action: 'venue.update', targetId: null, target: null }, 'Edited'],
    // A toggle whose row didn't keep its flag reads neutrally.
    [
      {
        action: 'feature_flag.toggle',
        target: { kind: 'feature-flag', name: 'Crews', href: null },
        metadata: null,
      },
      'Changed the Crews setting',
    ],
    [
      {
        action: 'feature_flag.toggle',
        target: { kind: 'feature-flag', name: 'Crews', href: null },
        metadata: { enabled: false },
      },
      'Turned Crews off',
    ],
    [
      {
        action: 'artist.visibility.update',
        target: { kind: 'artist', name: 'Wilco', href: null },
        metadata: { hidden: true },
      },
      'Hid Wilco',
    ],
    [
      {
        action: 'artist.visibility.update',
        target: { kind: 'artist', name: 'Wilco', href: null },
        metadata: { hidden: false },
      },
      'Showed Wilco again',
    ],
    [
      {
        action: 'artist.visibility.update',
        target: { kind: 'artist', name: 'Wilco', href: null },
        metadata: null,
      },
      'Changed whether Wilco is hidden',
    ],
    [
      {
        action: 'user.test_account.set',
        target: { kind: 'person', name: '@sam', href: null },
        metadata: { isTest: false },
      },
      'Untagged @sam as a test account',
    ],
    [
      {
        action: 'user.test_account.set',
        target: { kind: 'person', name: '@sam', href: null },
        metadata: {},
      },
      'Changed whether @sam is a test account',
    ],
  ])('reads %j as "%s"', (over, expected) => {
    expect(words(over)).toBe(expected);
  });
});
