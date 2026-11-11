// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { FeedbackExpanded } from './FeedbackExpanded';
import type { FeedbackItem } from './FeedbackRow';

afterEach(cleanup);

const labels = ADMIN_COPY.feedback.expanded.contextRowLabels;

const item = (metadata: Record<string, unknown>): FeedbackItem => ({
  id: 'fb1',
  userId: 'user_1',
  pageUrl: '/venues/bluebird-theater',
  category: 'bug',
  message: 'Opening a show',
  metadata,
  status: 'unread',
  adminNotes: null,
  issueUrl: null,
  createdAt: '2026-11-11T10:00:00.000Z',
});

const renderItem = (metadata: Record<string, unknown>) =>
  render(
    <FeedbackExpanded
      item={item(metadata)}
      onStatusChange={vi.fn()}
      onNotesChange={vi.fn()}
    />,
  );

describe('FeedbackExpanded error ids', () => {
  it('shows the error page id, and no digest row that repeats it', () => {
    renderItem({ source: 'error', errorId: '4242', digest: '4242' });
    expect(screen.getByText(labels.errorId)).toBeInTheDocument();
    expect(screen.queryByText(labels.errorDigest)).toBeNull();
  });

  it('shows a minted browser id', () => {
    renderItem({ source: 'error', errorId: '0042137731' });
    expect(screen.getByText('0042137731')).toBeInTheDocument();
  });

  it('still shows an older report by its digest and Sentry event', () => {
    renderItem({ source: 'error', digest: '99', sentryEventId: 'abc123' });
    expect(screen.queryByText(labels.errorId)).toBeNull();
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('puts the error id in the GitHub issue body', () => {
    renderItem({ source: 'error', errorId: '0042137731' });
    const issue = screen
      .getAllByRole('link')
      .map((link) => decodeURIComponent(link.getAttribute('href') ?? ''))
      .find((href) => href.includes('github.com'));
    expect(issue).toContain('- Error ID: 0042137731');
  });
});
