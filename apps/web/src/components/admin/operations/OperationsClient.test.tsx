// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { ADMIN_PHONE_MAX_WIDTH } from '@/components/admin/primitives';
import { FeedbackView } from '@/components/admin/feedback/FeedbackView';
import type { FeedbackItem } from '@/components/admin/feedback/FeedbackRow';
import { OperationsClient } from './OperationsClient';

// One stable function, so an effect keyed on it never re-runs per render.
const getToken = () => Promise.resolve('test-token');
vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

const COPY = ADMIN_COPY.operations;

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const item = (id: string, status: FeedbackItem['status']): FeedbackItem => ({
  id,
  userId: 'user_1',
  submittedBy: 'mira',
  pageUrl: '/',
  category: 'bug',
  message: `message ${id}`,
  metadata: null,
  status,
  adminNotes: null,
  issueUrl: null,
  createdAt: new Date().toISOString(),
  resolvedBy: null,
  resolvedAt: null,
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** The list and its counts, routed by URL; the badge reads `unread`. */
const serve = (items: FeedbackItem[], unread = 0) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) =>
      new URL(String(input)).pathname === '/v1/admin/feedback/counts'
        ? json({
            success: true,
            data: {
              unread,
              toRead: items.length,
              done: 0,
              kinds: { bugs: items.length, ideas: 0, venues: 0 },
            },
          })
        : json({ success: true, data: items }),
    ),
  );

beforeEach(() => {
  mockMatchMedia(false);
  serve([]);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The inbox settles its first reads; waiting on them keeps updates inside act.
const settle = () =>
  waitFor(() =>
    expect(
      screen.queryByTestId('feedback-list') ??
        screen.queryByTestId('empty-state'),
    ).not.toBeNull(),
  );

const FOUR_UNREAD = [
  item('a', 'unread'),
  item('b', 'unread'),
  item('c', 'unread'),
  item('d', 'unread'),
  item('e', 'flagged'),
  item('f', 'read'),
];

describe('OperationsClient (07/activity-log)', () => {
  it('draws exactly one h1, Operations', async () => {
    render(<OperationsClient />);
    await settle();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(COPY.title);
    expect(screen.getByText(COPY.subtitle)).toBeInTheDocument();
  });

  it('wires the Feedback tab to its panel both ways', async () => {
    render(<OperationsClient />);
    await settle();
    expect(screen.getByRole('tablist')).toHaveAccessibleName(COPY.tabsLabel);
    const tab = screen.getByRole('tab', { name: COPY.tabs.feedback });
    const panel = screen.getByRole('tabpanel');
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
  });

  it("counts the tab from the inbox's unread count, read out as N unread", async () => {
    serve(FOUR_UNREAD, 4);
    render(<OperationsClient />);
    const count = await screen.findByTestId('operations-feedback-unread');
    expect(count).toHaveTextContent('4');
    expect(count).toHaveAttribute('aria-hidden');
    const label = screen.getByText(COPY.unreadCountLabel(4));
    expect(label).toHaveClass('sr-only');
    expect(label).toHaveTextContent('4 unread');
  });

  it('draws no count when nothing is unread', async () => {
    serve([item('a', 'read')]);
    render(<OperationsClient />);
    await settle();
    expect(screen.queryByTestId('operations-feedback-unread')).toBeNull();
    expect(screen.queryByText(/unread$/)).toBeNull();
  });

  it('leaves the title to the phone header on a phone', async () => {
    mockMatchMedia(true);
    render(<OperationsClient />);
    await settle();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('tab', { name: /Feedback/ })).toBeInTheDocument();
  });

  it('embeds Feedback without a heading of its own', async () => {
    render(<OperationsClient />);
    await settle();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.queryByRole('heading', { name: ADMIN_COPY.feedback.title }),
    ).toBeNull();
  });
});

describe('FeedbackView', () => {
  it('has no heading of its own', async () => {
    render(<FeedbackView />);
    await settle();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(
      screen.queryByRole('heading', { name: ADMIN_COPY.feedback.title }),
    ).toBeNull();
  });

  it('switches at the admin breakpoint, the same query as the shell', async () => {
    render(<FeedbackView />);
    await settle();
    const queries = vi
      .mocked(window.matchMedia)
      .mock.calls.map(([query]) => query);
    expect(queries.length).toBeGreaterThan(0);
    expect(new Set(queries)).toEqual(
      new Set([`(max-width: ${ADMIN_PHONE_MAX_WIDTH}px)`]),
    );
  });

  it('reports its unread count once loaded', async () => {
    serve(FOUR_UNREAD, 4);
    const onCounts = vi.fn();
    render(<FeedbackView onCounts={onCounts} />);
    await waitFor(() =>
      expect(onCounts).toHaveBeenLastCalledWith({ unread: 4 }),
    );
  });
});
