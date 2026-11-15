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
import type {
  AdminFeedbackCounts,
  AdminFeedbackItem,
} from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { FeedbackView } from './FeedbackView';

// P47-19 PR 4b: the Feedback item (`07/a-feedback-item-in-flow`,
// `07/feedback-item-mobile`, addendum 7 `02-error-reports`, `03-…`).

const auth = vi.hoisted(() => ({ getToken: async () => 'token' }));
vi.mock('@clerk/nextjs', () => ({ useAuth: () => auth }));

// The URL is the item's one source: `replace` writes the search and the
// mocked `useSearchParams` re-renders on it.
const nav = vi.hoisted(() => {
  let search = '';
  const subs = new Set<() => void>();
  return {
    get: () => search,
    set: (next: string) => {
      search = next;
      subs.forEach((fn) => fn());
    },
    subscribe: (fn: () => void) => {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
    replace: vi.fn(),
    refresh: vi.fn(),
  };
});
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const router = {
    push: vi.fn(),
    replace: (href: string) => {
      nav.replace(href);
      nav.set(new URL(href, 'https://admin.test').search);
    },
    refresh: nav.refresh,
  };
  return {
    useRouter: () => router,
    useSearchParams: () =>
      new URLSearchParams(useSyncExternalStore(nav.subscribe, nav.get)),
  };
});

const COPY = ADMIN_COPY.feedback.item;
const ROW = ADMIN_COPY.feedback.row;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const phone = (on: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: on,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const item = (over: Partial<AdminFeedbackItem> = {}): AdminFeedbackItem => ({
  id: 'f1',
  userId: 'user_1',
  submittedBy: 'mira.k',
  pageUrl: 'https://concertcrawl.app/e/vince-staples',
  category: 'bug',
  message:
    'Map button does nothing on iPhone\nTapped Directions and nothing happened.',
  metadata: { device: 'iPhone · Safari 18', build: '0.42.1' },
  status: 'unread',
  adminNotes: null,
  issueUrl: null,
  // 9:14 PM on Nov 8 in Mountain Time.
  createdAt: '2026-11-09T04:14:00Z',
  resolvedBy: null,
  resolvedAt: null,
  ...over,
});

const ERROR_REPORT = item({
  id: 'e1',
  submittedBy: 'dlo',
  pageUrl: 'https://concertcrawl.app/watching',
  message:
    'Opening a show from a notification. Tapped it and the page went blank.',
  metadata: {
    source: 'error',
    doing: 'Opening a show from a notification',
    build: '0.42.1',
    device: 'iPhone · Safari 18',
    digest: 'c-7f3a91d2',
    sentryEventId: '4b1e2c3d4e5f6a7b8c9d0e1f2a3b09ac',
  },
});

const COUNTS: AdminFeedbackCounts = {
  unread: 3,
  toRead: 4,
  done: 41,
  kinds: { bugs: 2, ideas: 1, venues: 1 },
};

let rows: AdminFeedbackItem[];
let patchStatus: number;
let fetchMock: ReturnType<typeof vi.fn>;
const listCalls = () =>
  fetchMock.mock.calls.filter(
    ([input, init]) =>
      new URL(String(input)).pathname === '/v1/admin/feedback' &&
      init?.method !== 'PATCH',
  );
const patches = () =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([input, init]) => ({
      path: new URL(String(input)).pathname,
      body: JSON.parse(String(init?.body)) as Record<string, string>,
    }));

beforeEach(() => {
  phone(false);
  nav.set('');
  nav.replace.mockClear();
  rows = [item()];
  patchStatus = 200;
  fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (init?.method === 'PATCH')
      return json({ success: patchStatus < 400 }, patchStatus);
    if (url.pathname === '/v1/admin/feedback/counts')
      return json({ success: true, data: COUNTS });
    return json({ success: true, data: rows });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Renders the list and opens its first row. */
const openFirst = async () => {
  render(<FeedbackView />);
  fireEvent.click((await screen.findAllByTestId('feedback-row'))[0]!);
  return screen.findByTestId('feedback-item');
};

const fieldKeys = () =>
  screen
    .getAllByTestId(/^feedback-field-/)
    .map((el) => el.dataset['testid']?.replace('feedback-field-', ''));

const button = (name: string) => screen.getByRole('button', { name });

describe('opening an item', () => {
  it('opens a row in the side panel on desktop, at ?item=, and closes it', async () => {
    await openFirst();
    expect(nav.replace).toHaveBeenLastCalledWith(
      '/admin/operations?tab=feedback&item=f1',
    );
    const panel = screen.getByTestId('side-panel');
    expect(
      within(panel).getByRole('heading', {
        name: 'Map button does nothing on iPhone',
      }),
    ).toBeInTheDocument();
    expect(within(panel).getByText('Nov 8 · 9:14 PM')).toBeInTheDocument();
    expect(screen.queryByTestId('phone-item-page')).toBeNull();
    // The row keeps the harness's stem.
    expect(screen.getByTestId('feedback-row')).toHaveAccessibleName(
      new RegExp(`^${ROW.expandLabel}`),
    );

    fireEvent.click(button(ADMIN_COPY.panel.close));
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/operations');
    expect(screen.queryByTestId('side-panel')).toBeNull();
  });

  it('opens a row as a page on the phone, back to Feedback, actions pinned', async () => {
    phone(true);
    await openFirst();
    const page = screen.getByTestId('phone-item-page');
    expect(screen.queryByTestId('side-panel')).toBeNull();
    expect(screen.getByTestId('phone-item-back')).toHaveTextContent(
      ADMIN_COPY.feedback.title,
    );
    // No drawn menu, so no ⋯.
    expect(screen.queryByTestId('phone-item-more')).toBeNull();
    const footer = within(page).getByTestId('phone-item-footer');
    expect(
      within(footer).getByRole('button', { name: COPY.markDone }),
    ).toBeInTheDocument();
    expect(
      within(footer).getByRole('button', { name: COPY.replyPhone }),
    ).toBeDisabled();
    expect(within(footer).getByText(COPY.github)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('phone-item-back'));
    expect(screen.queryByTestId('phone-item-page')).toBeNull();
  });

  it('opens the item a link names', async () => {
    nav.set('?tab=feedback&item=f1');
    render(<FeedbackView />);
    expect(await screen.findByTestId('side-panel')).toBeInTheDocument();
  });
});

describe('each kind', () => {
  it('draws a bug: its first line, the rest quoted, the screenshot and its lines', async () => {
    rows = [
      item({
        metadata: {
          device: 'iPhone · Safari 18',
          build: '0.42.1',
          screenshot: 'https://img.test/shot.png',
        },
      }),
    ];
    await openFirst();
    expect(screen.getByTestId('feedback-item-quote')).toHaveTextContent(
      '“Tapped Directions and nothing happened.”',
    );
    expect(screen.getByTestId('feedback-screenshot')).toHaveAttribute(
      'src',
      'https://img.test/shot.png',
    );
    expect(fieldKeys()).toEqual(['page', 'device', 'build', 'from']);
    expect(screen.getByTestId('feedback-field-page')).toHaveTextContent(
      'Event',
    );
    expect(
      within(screen.getByTestId('feedback-field-from')).getByRole('link', {
        name: '@mira.k',
      }),
    ).toHaveAttribute('href', '/admin/people/user_1');
  });

  it('draws an idea as a bug without a screenshot, and no quote for one line', async () => {
    rows = [item({ category: 'idea', message: 'Paste a ticket link' })];
    await openFirst();
    expect(
      within(screen.getByTestId('side-panel')).getByText(ADMIN_COPY.kind.idea),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('feedback-item-quote')).toBeNull();
    expect(screen.queryByTestId('feedback-screenshot')).toBeNull();
    expect(button(COPY.reply)).toBeDisabled();
  });

  it('draws an error report: one quote, every line, Copy, Mark done and GitHub only', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    rows = [ERROR_REPORT];
    await openFirst();
    expect(
      screen.getByRole('heading', {
        name: 'Something went wrong on Watching',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('feedback-item-quote')).toHaveTextContent(
      `“${ERROR_REPORT.message}”`,
    );
    expect(fieldKeys()).toEqual([
      'page',
      'doing',
      'build',
      'device',
      'errorId',
      'sentryEvent',
      'from',
    ]);
    // The long event id is drawn by its ends, and copied whole.
    expect(screen.getByTestId('feedback-field-sentryEvent')).toHaveTextContent(
      '4b1e…09ac',
    );
    fireEvent.click(button(COPY.copyLabel(COPY.fields.sentryEvent)));
    expect(writeText).toHaveBeenCalledWith('4b1e2c3d4e5f6a7b8c9d0e1f2a3b09ac');
    fireEvent.click(button(COPY.copyLabel(COPY.fields.errorId)));
    expect(writeText).toHaveBeenLastCalledWith('c-7f3a91d2');
    expect(await screen.findAllByText(COPY.copied)).not.toHaveLength(0);

    expect(screen.queryByRole('button', { name: COPY.reply })).toBeNull();
    expect(screen.getByText(COPY.errorFootnote)).toBeInTheDocument();
  });

  it('leaves out an error report line with no value', async () => {
    rows = [
      item({
        id: 'e2',
        submittedBy: null,
        userId: null,
        category: 'error_report',
        metadata: { source: 'error', digest: 'c-1' },
      }),
    ];
    await openFirst();
    // No user behind it: From says Sentry, unlinked.
    expect(fieldKeys()).toEqual(['page', 'errorId', 'from']);
    expect(screen.getByTestId('feedback-field-from')).toHaveTextContent(
      ROW.sentry,
    );
    expect(
      within(screen.getByTestId('feedback-field-from')).queryByRole('link'),
    ).toBeNull();
  });

  it('draws a venue suggestion: the set title, the message, From and Sent from', async () => {
    rows = [
      item({
        category: 'venue_suggestion',
        pageUrl: 'https://concertcrawl.app/venues',
        message: 'Dazzle on Curtis has jazz almost every night',
        metadata: null,
      }),
    ];
    await openFirst();
    expect(
      screen.getByRole('heading', { name: COPY.venueTitle }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('feedback-item-quote')).toHaveTextContent(
      '“Dazzle on Curtis has jazz almost every night”',
    );
    expect(fieldKeys()).toEqual(['from', 'sentFrom']);
    expect(screen.queryByRole('button', { name: COPY.reply })).toBeNull();
    expect(button(COPY.markDone)).toBeInTheDocument();
  });
});

describe('Reply', () => {
  it('is drawn disabled, with its line', async () => {
    await openFirst();
    const reply = button(COPY.reply);
    expect(reply).toBeDisabled();
    expect(reply).toHaveAccessibleDescription(COPY.replyLine);
  });

  it('is hidden with no user to reply to', async () => {
    rows = [item({ userId: null, submittedBy: null })];
    await openFirst();
    expect(screen.queryByRole('button', { name: COPY.reply })).toBeNull();
    expect(screen.queryByText(COPY.replyLine)).toBeNull();
    // A bug with no handle names no one.
    expect(screen.queryByTestId('feedback-field-from')).toBeNull();
  });
});

describe('the actions', () => {
  it('Mark done PATCHes resolved, closes the item and re-reads the list', async () => {
    await openFirst();
    const before = listCalls().length;
    fireEvent.click(button(COPY.markDone));
    await waitFor(() =>
      expect(patches()).toEqual([
        { path: '/v1/admin/feedback/f1', body: { status: 'resolved' } },
      ]),
    );
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
    expect(nav.replace).toHaveBeenLastCalledWith('/admin/operations');
    expect(nav.refresh).toHaveBeenCalled();
  });

  it('opens GitHub on a new issue, or the linked one', async () => {
    await openFirst();
    const link = screen.getByRole('link', { name: COPY.github });
    expect(link.getAttribute('href')).toMatch(
      /^https:\/\/github\.com\/featherweight-design\/concert-crawl\/issues\/new\?title=/,
    );
    cleanup();
    rows = [item({ issueUrl: 'https://github.com/o/r/issues/9' })];
    await openFirst();
    expect(screen.getByRole('link', { name: COPY.github })).toHaveAttribute(
      'href',
      'https://github.com/o/r/issues/9',
    );
  });

  it('shows a failed PATCH in the item, and Try again sends it again', async () => {
    patchStatus = 500;
    await openFirst();
    fireEvent.click(button(COPY.markDone));
    const alert = await screen.findByTestId('save-failed');
    expect(alert).toHaveTextContent(COPY.failed.markDone);
    expect(alert).toHaveTextContent(COPY.failed.stillToRead);
    expect(screen.getByTestId('side-panel')).toBeInTheDocument();

    patchStatus = 200;
    fireEvent.click(
      within(alert).getByRole('button', {
        name: ADMIN_COPY.states.saveFailed.tryAgain,
      }),
    );
    await waitFor(() => expect(patches()).toHaveLength(2));
    await waitFor(() => expect(screen.queryByTestId('side-panel')).toBeNull());
  });

  it('saves the note when you leave it', async () => {
    await openFirst();
    const note = screen.getByLabelText(COPY.note);
    expect(note).toHaveAttribute('placeholder', COPY.notePlaceholder);
    fireEvent.change(note, { target: { value: 'Probably the maps:// link' } });
    fireEvent.blur(note);
    await waitFor(() =>
      expect(patches()).toEqual([
        {
          path: '/v1/admin/feedback/f1',
          body: { adminNotes: 'Probably the maps:// link' },
        },
      ]),
    );
  });

  it('saves the note as you type, once it settles', async () => {
    await openFirst();
    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByLabelText(COPY.note), {
        target: { value: 'Seen it' },
      });
      expect(patches()).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(1000);
    } finally {
      vi.useRealTimers();
    }
    await waitFor(() =>
      expect(patches()[0]?.body).toEqual({ adminNotes: 'Seen it' }),
    );
  });

  it("says when the note didn't save", async () => {
    patchStatus = 500;
    await openFirst();
    const note = screen.getByLabelText(COPY.note);
    fireEvent.change(note, { target: { value: 'x1' } });
    fireEvent.blur(note);
    expect(await screen.findByTestId('save-failed')).toHaveTextContent(
      COPY.failed.note,
    );
  });
});

describe('a Done item', () => {
  const doneRow = (over: Partial<AdminFeedbackItem> = {}) =>
    item({
      status: 'resolved',
      resolvedBy: 'hugh',
      resolvedAt: '2026-11-03T18:00:00Z',
      ...over,
    });

  it('shows Done by, Reopen and GitHub, and no Mark done or Reply', async () => {
    rows = [doneRow()];
    await openFirst();
    expect(
      within(screen.getByTestId('feedback-item')).getByText(ROW.done),
    ).toBeVisible();
    expect(screen.getByTestId('feedback-item-done-line')).toHaveTextContent(
      'Done by @hugh · Nov 3',
    );
    expect(screen.queryByRole('button', { name: COPY.markDone })).toBeNull();
    expect(screen.queryByRole('button', { name: COPY.reply })).toBeNull();
    expect(screen.getByRole('link', { name: COPY.github })).toBeInTheDocument();
    expect(screen.getByText(COPY.reopenFootnote)).toBeInTheDocument();
  });

  it.each([
    [{ resolvedBy: null }, 'Done · Nov 3'],
    [{ resolvedBy: null, resolvedAt: null }, 'Done'],
  ])('says %o as %s', async (over, line) => {
    rows = [doneRow(over)];
    await openFirst();
    expect(screen.getByTestId('feedback-item-done-line')).toHaveTextContent(
      new RegExp(`^${line}$`),
    );
  });

  it('Reopen PATCHes it back to To read and re-reads the list', async () => {
    rows = [doneRow()];
    await openFirst();
    const before = listCalls().length;
    fireEvent.click(button(COPY.reopen));
    await waitFor(() =>
      expect(patches()).toEqual([
        { path: '/v1/admin/feedback/f1', body: { status: 'read' } },
      ]),
    );
    await waitFor(() => expect(listCalls().length).toBeGreaterThan(before));
  });
});
