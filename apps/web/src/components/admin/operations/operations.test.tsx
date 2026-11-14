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
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

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

let logPage: (url: URL) => Response;
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
  logPage = () => json({ success: true, data: [item()], nextCursor: null });
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === '/v1/admin/audit-log') return logPage(url);
    return json({ success: true, data: [] });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const renderLog = () =>
  render(<OperationsClient initialTab="log" feedbackUnread={4} />);

describe('Operations shell', () => {
  it('draws Feedback (with its count) and Activity log, and no Emails', () => {
    render(<OperationsClient initialTab="feedback" feedbackUnread={4} />);
    expect(
      screen.getByRole('heading', { level: 1, name: COPY.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(COPY.subtitle)).toBeInTheDocument();
    const tabs = within(screen.getByTestId('operations-tabs')).getAllByRole(
      'tab',
    );
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Feedback4',
      'Activity log',
    ]);
    expect(screen.queryByText('Emails')).not.toBeInTheDocument();
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('renders the existing feedback page in the Feedback tab', async () => {
    render(<OperationsClient initialTab="feedback" feedbackUnread={null} />);
    expect(
      await screen.findByText(ADMIN_COPY.feedback.emptyState),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toContainEqual(
      expect.stringContaining('/v1/admin/feedback?limit=200'),
    );
  });

  it('switches to the Activity log', async () => {
    render(<OperationsClient initialTab="feedback" feedbackUnread={0} />);
    fireEvent.click(screen.getByRole('tab', { name: COPY.tabs.log }));
    expect(await screen.findByTestId('activity-log-table')).toBeInTheDocument();
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

  it('walks the cursor and stops at 1000 rows with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let page = 0;
    logPage = () => {
      page += 1;
      return json({
        success: true,
        data: Array.from({ length: 100 }, (_, i) =>
          item({ id: `r${page}-${i}` }),
        ),
        nextCursor: `cursor-${page}`,
      });
    };
    renderLog();
    await waitFor(() =>
      expect(screen.getAllByTestId('activity-log-row')).toHaveLength(1000),
    );
    expect(logCalls()).toHaveLength(10);
    expect(logCalls()[1]?.searchParams.get('cursor')).toBe('cursor-1');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('1000'));
  });

  it('sends Anyone as actorHandle and Any page as area', async () => {
    logPage = () =>
      json({
        success: true,
        data: [item(), item({ id: 'a2', actor: 'jules' })],
        nextCursor: null,
      });
    renderLog();
    await screen.findByTestId('activity-log-table');
    fireEvent.change(screen.getByLabelText(COPY.log.whoLabel), {
      target: { value: 'jules' },
    });
    await waitFor(() =>
      expect(logCalls().at(-1)?.searchParams.get('actorHandle')).toBe('jules'),
    );
    fireEvent.change(screen.getByLabelText(COPY.log.whereLabel), {
      target: { value: 'venues' },
    });
    await waitFor(() =>
      expect(logCalls().at(-1)?.searchParams.get('area')).toBe('venues'),
    );
    expect(logCalls().at(-1)?.searchParams.get('actorHandle')).toBe('jules');
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
    expect(await screen.findByTestId('activity-log-empty')).toHaveTextContent(
      COPY.log.emptyTitle,
    );
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
    expect(screen.queryByLabelText(COPY.log.whoLabel)).not.toBeInTheDocument();
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
    [{ action: 'crawl.trigger_all', target: null }, 'Crawled all venues'],
    [
      { target: { kind: 'invite-code', name: null, href: null } },
      'Revoked invite code (deleted)',
    ],
    [{ action: 'venue.new_thing', target: null }, 'Venue new thing'],
  ])('reads %j as "%s"', (over, expected) => {
    expect(words(over)).toBe(expected);
  });
});
