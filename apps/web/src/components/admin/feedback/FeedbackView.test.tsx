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

// P47-19 PR 4a: the Feedback list (`07/feedback*`).

// One stable getToken, so the load effect never re-runs per render.
const auth = vi.hoisted(() => ({ getToken: async () => 'token' }));
vi.mock('@clerk/nextjs', () => ({ useAuth: () => auth }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const COPY = ADMIN_COPY.feedback;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const item = (over: Partial<AdminFeedbackItem> = {}): AdminFeedbackItem => ({
  id: 'f1',
  userId: 'user_1',
  submittedBy: 'mira.k',
  pageUrl: 'https://concertcrawl.app/artists/vince-staples',
  category: 'bug',
  message: 'Map button does nothing on iPhone',
  metadata: null,
  status: 'read',
  adminNotes: null,
  issueUrl: null,
  createdAt: '2026-11-08T18:00:00Z',
  resolvedBy: null,
  resolvedAt: null,
  ...over,
});

const COUNTS: AdminFeedbackCounts = {
  unread: 3,
  toRead: 4,
  done: 41,
  kinds: { bugs: 2, ideas: 1, venues: 1 },
};

let list: (url: URL) => Response;
let fetchMock: ReturnType<typeof vi.fn>;
const listCalls = () =>
  fetchMock.mock.calls
    .map(([input]) => new URL(String(input)))
    .filter((url) => url.pathname === '/v1/admin/feedback');

beforeEach(() => {
  mockMatchMedia(false);
  list = () => json({ success: true, data: [item()] });
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === '/v1/admin/feedback/counts')
      return json({ success: true, data: COUNTS });
    return list(url);
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const chip = (key: string) => screen.findByTestId(`feedback-chip-${key}`);

describe('FeedbackView (07/feedback)', () => {
  it('counts each chip and reads a kind inside To read', async () => {
    render(<FeedbackView />);
    const expected = [
      ['to_read', COPY.chips.to_read, '4'],
      ['bugs', COPY.chips.bugs, '2'],
      ['ideas', COPY.chips.ideas, '1'],
      ['venues', COPY.chips.venues, '1'],
      ['done', COPY.chips.done, '41'],
    ] as const;
    for (const [key, label, count] of expected) {
      expect(await chip(key)).toHaveTextContent(`${label}${count}`);
    }
    expect(await chip('to_read')).toHaveAttribute('aria-pressed', 'true');
    expect(listCalls()[0]?.searchParams.get('view')).toBe('to_read');
    expect(listCalls()[0]?.searchParams.has('kind')).toBe(false);

    fireEvent.click(await chip('bugs'));
    await waitFor(() =>
      expect(listCalls().at(-1)?.searchParams.get('kind')).toBe('bugs'),
    );
    expect(listCalls().at(-1)?.searchParams.get('view')).toBe('to_read');
    expect(await chip('bugs')).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides the Venues chip on a phone', async () => {
    mockMatchMedia(true);
    render(<FeedbackView />);
    expect(await chip('bugs')).toBeInTheDocument();
    expect(screen.queryByTestId('feedback-chip-venues')).toBeNull();
  });

  it("titles a row with the message's first line", async () => {
    list = () =>
      json({
        success: true,
        data: [item({ message: '\nCalendar skips Sundays\nSteps: open it' })],
      });
    render(<FeedbackView />);
    const title = await screen.findByTestId('feedback-row-title');
    expect(title).toHaveTextContent('Calendar skips Sundays');
    expect(screen.queryByText(/Steps: open it/)).toBeNull();
    expect(screen.getByText('@mira.k · Nov 8')).toBeInTheDocument();
  });

  it('marks only unread rows with the dot, and names Sentry for a handle-less error report', async () => {
    list = () =>
      json({
        success: true,
        data: [
          item({ id: 'a', status: 'unread' }),
          item({
            id: 'b',
            category: 'error_report',
            submittedBy: null,
            userId: null,
          }),
        ],
      });
    render(<FeedbackView />);
    const rows = await screen.findAllByTestId('feedback-row');
    expect(within(rows[0]!).getByTestId('feedback-unread-dot')).toBeVisible();
    expect(within(rows[1]!).queryByTestId('feedback-unread-dot')).toBeNull();
    expect(within(rows[1]!).getByText('Sentry · Nov 8')).toBeInTheDocument();
    // To read rows carry no right-side line.
    expect(screen.queryByTestId('feedback-done-by')).toBeNull();
  });

  it('shows Done with search, who finished each, and the caption', async () => {
    render(<FeedbackView />);
    list = () =>
      json({
        success: true,
        data: [
          item({
            id: 'a',
            status: 'resolved',
            resolvedBy: 'hugh',
            resolvedAt: '2026-11-08T18:00:00Z',
          }),
          // 03:00 UTC is still Nov 7 in Mountain Time.
          item({
            id: 'b',
            status: 'resolved',
            resolvedAt: '2026-11-08T03:00:00Z',
          }),
          item({ id: 'c', status: 'archived' }),
        ],
      });
    fireEvent.click(await chip('done'));
    await waitFor(() =>
      expect(screen.getAllByTestId('feedback-done-by')).toHaveLength(3),
    );
    expect(
      screen.getAllByTestId('feedback-done-by').map((el) => el.textContent),
    ).toEqual(['Done by @hugh · Nov 8', 'Done · Nov 7', 'Done']);
    expect(screen.getByText(COPY.doneCaption)).toBeInTheDocument();
    expect(screen.queryByTestId('feedback-chip-bugs')).toBeNull();
    expect(screen.getByTestId('feedback-chip-to_read')).toBeInTheDocument();
    expect(listCalls().at(-1)?.searchParams.get('view')).toBe('done');

    fireEvent.change(screen.getByRole('searchbox', { name: COPY.search }), {
      target: { value: 'map' },
    });
    await waitFor(() =>
      expect(listCalls().at(-1)?.searchParams.get('search')).toBe('map'),
    );
    expect(listCalls().at(-1)?.searchParams.get('view')).toBe('done');
  });

  it('says All read when nothing is waiting', async () => {
    list = () => json({ success: true, data: [] });
    render(<FeedbackView />);
    expect(await screen.findByText(COPY.empty.title)).toBeInTheDocument();
    expect(screen.getByText(COPY.empty.body)).toBeInTheDocument();
  });

  it("falls into Couldn't load and retries", async () => {
    let fail = true;
    list = () =>
      fail
        ? json({ success: false }, 500)
        : json({ success: true, data: [item()] });
    render(<FeedbackView />);
    const retry = await screen.findByRole('button', {
      name: ADMIN_COPY.states.couldntLoad.tryAgain,
    });
    expect(screen.getByTestId('couldnt-load')).toBeInTheDocument();
    fail = false;
    fireEvent.click(retry);
    expect(await screen.findByTestId('feedback-row')).toBeInTheDocument();
    expect(screen.queryByTestId('couldnt-load')).toBeNull();
  });

  it('reports the unread count for the tab', async () => {
    const onCounts = vi.fn();
    render(<FeedbackView onCounts={onCounts} />);
    await waitFor(() => expect(onCounts).toHaveBeenCalledWith({ unread: 3 }));
  });
});
