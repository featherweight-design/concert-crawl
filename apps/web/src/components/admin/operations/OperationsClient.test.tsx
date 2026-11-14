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
  pageUrl: '/',
  category: 'bug',
  message: `message ${id}`,
  metadata: null,
  status,
  adminNotes: null,
  issueUrl: null,
  createdAt: new Date().toISOString(),
});

const serve = (items: FeedbackItem[]) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ data: items }) })),
  );

beforeEach(() => {
  mockMatchMedia(false);
  serve([]);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The inbox settles its first fetch; waiting on it keeps updates inside act.
const settle = () => waitFor(() => expect(fetch).toHaveBeenCalled());

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

  it("counts the tab from the inbox's own items, read out as N unread", async () => {
    serve(FOUR_UNREAD);
    render(<OperationsClient />);
    const count = await screen.findByTestId('operations-feedback-unread');
    expect(count).toHaveTextContent('4');
    expect(count).toHaveAttribute('aria-hidden');
    const label = screen.getByText(COPY.unreadCountLabel(4));
    expect(label).toHaveClass('sr-only');
    expect(label).toHaveTextContent('4 unread');
    // One read: the list. No separate counts endpoint.
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('draws no count when nothing is unread', async () => {
    serve([item('a', 'read')]);
    render(<OperationsClient />);
    await settle();
    await waitFor(() =>
      expect(screen.queryByText(ADMIN_COPY.feedback.loadingState)).toBeNull(),
    );
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

  it('leads the phone inbox with its unread and flagged counts', async () => {
    mockMatchMedia(true);
    serve(FOUR_UNREAD);
    render(<FeedbackView />);
    expect(
      await screen.findByTestId('feedback-phone-counts'),
    ).toHaveTextContent('4 unread · 1 flagged');
  });

  it('reports its counts once loaded', async () => {
    serve(FOUR_UNREAD);
    const onCounts = vi.fn();
    render(<FeedbackView onCounts={onCounts} />);
    await waitFor(() =>
      expect(onCounts).toHaveBeenLastCalledWith({ unread: 4, flagged: 1 }),
    );
  });
});
