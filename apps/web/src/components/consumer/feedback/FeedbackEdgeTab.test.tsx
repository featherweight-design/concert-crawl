// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';

vi.mock('./FeedbackModal', () => ({
  FeedbackModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="feedback-modal" /> : null,
}));

import { FeedbackEdgeTab } from './FeedbackEdgeTab';

afterEach(cleanup);

describe('FeedbackEdgeTab', () => {
  it('stays an accessible button that opens the feedback modal', () => {
    render(<FeedbackEdgeTab />);
    const button = screen.getByRole('button', {
      name: CONSUMER_COPY.feedback.edgeTab.ariaLabel,
    });
    expect(screen.queryByTestId('feedback-modal')).toBeNull();
    fireEvent.click(button);
    expect(screen.getByTestId('feedback-modal')).not.toBeNull();
  });

  it('anchors fixed to the right edge, under the sheets', () => {
    render(<FeedbackEdgeTab />);
    const anchor = screen.getByTestId('feedback-edge-tab-anchor');
    expect(anchor.className).toContain('fixed');
    expect(anchor.className).toContain('right-0');
    expect(anchor.className).toContain('z-[35]');
  });

  it('tucks in on phones and slides out on focus or press', () => {
    render(<FeedbackEdgeTab />);
    const anchor = screen.getByTestId('feedback-edge-tab-anchor');
    expect(anchor.className).toContain('max-sm:translate-x-3');
    expect(anchor.className).toContain('max-sm:focus-within:translate-x-0');
    expect(anchor.className).toContain('max-sm:active:translate-x-0');
  });
});
