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
  it('draws Feedback and Activity log, and no Emails', () => {
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
      'Activity log',
    ]);
    expect(screen.queryByText('Emails')).not.toBeInTheDocument();
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
  it("reads today's Mountain Time day at the largest page", async () => {
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
    expect(call?.searchParams.get('limit')).toBe('100');
    const midnight = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(day.start));
    expect(midnight).toBe('00:00');
  });

  it('walks the cursor, stops at 1000 rows, warns and says so', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let page = 0;
    logPage = () => {
      page += 1;
      return rowsPage(page, 100, `cursor-${page}`);
    };
    renderLog();
    await waitFor(() =>
      expect(screen.getAllByTestId('activity-log-row')).toHaveLength(1000),
    );
    expect(logCalls()).toHaveLength(10);
    expect(logCalls()[1]?.searchParams.get('cursor')).toBe('cursor-1');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('1000'));
    expect(screen.getByTestId('activity-log-capped')).toHaveTextContent(
      COPY.log.capped,
    );
  });

  it('reads a day of exactly 1000 rows whole: no warning, no notice', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let page = 0;
    logPage = () => {
      page += 1;
      return rowsPage(page, 100, page < 10 ? `cursor-${page}` : null);
    };
    renderLog();
    await waitFor(() =>
      expect(screen.getAllByTestId('activity-log-row')).toHaveLength(1000),
    );
    expect(logCalls()).toHaveLength(10);
    expect(warn).not.toHaveBeenCalled();
    expect(screen.queryByTestId('activity-log-capped')).not.toBeInTheDocument();
  });

  it('stops at 10 pages even when the pages run short', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let page = 0;
    logPage = () => {
      page += 1;
      return rowsPage(page, 5, `cursor-${page}`);
    };
    renderLog();
    await waitFor(() =>
      expect(screen.getAllByTestId('activity-log-row')).toHaveLength(50),
    );
    expect(logCalls()).toHaveLength(10);
    expect(screen.getByTestId('activity-log-capped')).toBeInTheDocument();
  });

  it('ends the walk at an empty page, even one with a cursor', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logPage = () => json({ success: true, data: [], nextCursor: 'again' });
    renderLog();
    expect(await screen.findByTestId('activity-log-empty')).toBeInTheDocument();
    expect(logCalls()).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
  });

  // All or nothing for a day: the rows before a failed page are not drawn.
  it("falls into Couldn't load when a later page fails, with no rows", async () => {
    let page = 0;
    logPage = () => {
      page += 1;
      return page === 1
        ? rowsPage(page, 100, 'cursor-1')
        : json({ success: false }, 500);
    };
    renderLog();
    expect(await screen.findByTestId('couldnt-load')).toBeInTheDocument();
    expect(logCalls()).toHaveLength(2);
    expect(screen.queryAllByTestId('activity-log-row')).toHaveLength(0);
  });

  it('aborts the walk on unmount, silently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let pending: AbortSignal | null = null;
    let page = 0;
    logPage = (_url, init) => {
      page += 1;
      if (page === 1) return rowsPage(page, 100, 'cursor-1');
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

  // `07/activity-log` draws Anyone and Today highlighted, Any page not. No
  // menu is drawn for them, so they are static text and read the whole day.
  it('draws Anyone, Any page and Today as static pills', async () => {
    renderLog();
    await screen.findByTestId('activity-log-table');
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    const filters = screen.getByText(COPY.log.anyone).parentElement;
    if (!filters) throw new Error('no pills');
    expect(filters).toHaveTextContent(
      `${COPY.log.anyone}${COPY.log.anyPage}${COPY.log.today}`,
    );
    expect(within(filters).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(filters).queryByRole('button')).not.toBeInTheDocument();
    expect(logCalls().at(-1)?.searchParams.has('actorHandle')).toBe(false);
    expect(logCalls().at(-1)?.searchParams.has('area')).toBe(false);
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

  it('shows the empty day', async () => {
    logPage = () => json({ success: true, data: [], nextCursor: null });
    renderLog();
    const empty = await screen.findByTestId('activity-log-empty');
    expect(empty).toHaveTextContent(COPY.log.emptyTitle);
    // No day picker yet, so it names no other day to pick.
    expect(empty).not.toHaveTextContent(/pick/i);
  });

  it("falls into Couldn't load", async () => {
    logPage = () => json({ success: false }, 500);
    renderLog();
    expect(await screen.findByTestId('couldnt-load')).toBeInTheDocument();
  });

  it('draws cards on the phone: sentence, then handle, time and page', async () => {
    setPhone(true);
    renderLog();
    const card = (await screen.findAllByTestId('activity-log-card'))[0];
    expect(card).toHaveTextContent('Revoked invite code SHARED1');
    expect(card).toHaveTextContent(/@hugh · \d{1,2}:\d{2} [AP]M · People/);
    expect(screen.queryByText(COPY.log.anyone)).not.toBeInTheDocument();
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
  'event.auto_cancel.stale',
  'event.bulk_auto_approve',
  'event.bulk_delete',
  'event.bulk_mark_as_concert',
  'event.bulk_mark_non_concert',
  'event.bulk_unverify',
  'event.delete',
  'event.drift_duplicates_merged',
  'event.fill_from_merge',
  'event.merge',
  'event.report.resolve',
  'event.sold_out.mark',
  'event.sold_out.clear',
  'event.update',
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
  'price.submission.edit_price',
  'price.submission.reject',
  'price.submission.update',
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
