// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { FeedbackView } from '@/components/admin/feedback/FeedbackView';
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

beforeEach(() => {
  mockMatchMedia(false);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) })),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The inbox settles its first fetch; waiting on it keeps updates inside act.
const settle = () => waitFor(() => expect(fetch).toHaveBeenCalled());

describe('OperationsClient (07/activity-log)', () => {
  it('draws exactly one h1, Operations', async () => {
    render(<OperationsClient feedbackUnread={4} />);
    await settle();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(COPY.title);
    expect(screen.getByText(COPY.subtitle)).toBeInTheDocument();
  });

  it('wires the Feedback tab to its panel both ways', async () => {
    render(<OperationsClient feedbackUnread={null} />);
    await settle();
    expect(screen.getByRole('tablist')).toHaveAccessibleName(COPY.tabsLabel);
    const tab = screen.getByRole('tab', { name: COPY.tabs.feedback });
    const panel = screen.getByRole('tabpanel');
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
  });

  it('shows a positive unread count, read out as "N unread"', async () => {
    render(<OperationsClient feedbackUnread={4} />);
    await settle();
    expect(screen.getByTestId('operations-feedback-unread')).toHaveTextContent(
      '4',
    );
    expect(screen.getByTestId('operations-feedback-unread')).toHaveAttribute(
      'aria-hidden',
    );
    const label = screen.getByText(COPY.unreadCountLabel(4));
    expect(label).toHaveClass('sr-only');
    expect(label).toHaveTextContent('4 unread');
  });

  it.each([0, null])('draws no count for %s', async (unread) => {
    render(<OperationsClient feedbackUnread={unread} />);
    await settle();
    expect(screen.queryByTestId('operations-feedback-unread')).toBeNull();
    expect(screen.queryByText(/unread$/)).toBeNull();
  });

  it('leaves the title to the phone header on a phone', async () => {
    mockMatchMedia(true);
    render(<OperationsClient feedbackUnread={2} />);
    await settle();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('tab', { name: /Feedback/ })).toBeInTheDocument();
  });

  it('embeds Feedback without its SectionHead', async () => {
    render(<OperationsClient feedbackUnread={null} />);
    await settle();
    expect(screen.queryByText(ADMIN_COPY.feedback.eyebrow)).toBeNull();
    expect(screen.queryByText(ADMIN_COPY.feedback.subtitle)).toBeNull();
    expect(
      screen.queryByRole('heading', { name: ADMIN_COPY.feedback.title }),
    ).toBeNull();
  });
});

describe('FeedbackView', () => {
  it('keeps its SectionHead standalone', async () => {
    render(<FeedbackView />);
    await settle();
    expect(screen.getByText(ADMIN_COPY.feedback.eyebrow)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: ADMIN_COPY.feedback.title,
      }),
    ).toBeInTheDocument();
  });

  it('drops it when embedded', async () => {
    render(<FeedbackView embedded />);
    await settle();
    expect(screen.queryByText(ADMIN_COPY.feedback.eyebrow)).toBeNull();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });
});
