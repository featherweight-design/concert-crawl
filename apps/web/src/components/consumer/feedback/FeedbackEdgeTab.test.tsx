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

  it('carries the fixed, right-0 and z-[35] classes on the anchor', () => {
    render(<FeedbackEdgeTab />);
    const anchor = screen.getByTestId('feedback-edge-tab-anchor');
    expect(anchor.className).toContain('fixed');
    expect(anchor.className).toContain('right-0');
    expect(anchor.className).toContain('z-[35]');
  });

  it('carries the phone tuck and the focus-within and active slide-out classes', () => {
    render(<FeedbackEdgeTab />);
    const anchor = screen.getByTestId('feedback-edge-tab-anchor');
    expect(anchor.className).toContain('max-sm:translate-x-3');
    expect(anchor.className).toContain('max-sm:focus-within:translate-x-0');
    expect(anchor.className).toContain('max-sm:active:translate-x-0');
  });

  it('carries a 12px transparent hit slop on phones and a focus-visible ring class', () => {
    render(<FeedbackEdgeTab />);
    const slop = screen.getByTestId('feedback-edge-tab-hit-slop');
    expect(slop.className).toContain('-left-3');
    expect(slop.className).toContain('w-3');
    const anchor = screen.getByTestId('feedback-edge-tab-anchor');
    expect(anchor.className).toContain('[&:has(:focus-visible)]:outline');
  });
});
