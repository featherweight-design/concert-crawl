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

  // Regression: under 1280 the tab was half tucked off-screen and slid out on
  // focus, and focus returning from the modal latched it out, so it read as
  // clipped until the first tap. It sits flush at every width, as drawn.
  it('sits flush at every width, with no tuck or slide-out', () => {
    render(<FeedbackEdgeTab />);
    const anchor = screen.getByTestId('feedback-edge-tab-anchor');
    const button = screen.getByRole('button', {
      name: CONSUMER_COPY.feedback.edgeTab.ariaLabel,
    });
    const classes = anchor.className.split(/\s+/);
    expect(classes).toContain('right-0');
    // No tuck by any route: a translate, a negative right offset or a
    // negative right margin, on the anchor's classes or either inline style.
    for (const token of classes) {
      expect(token).not.toMatch(
        /translate-x|(^|:)-right-|right-\[-|(^|:)-mr-|mr-\[-/,
      );
    }
    for (const el of [anchor, button]) {
      expect(el.style.right).not.toMatch(/^-/);
      expect(el.style.marginRight).not.toMatch(/^-/);
      expect(el.style.transform).not.toMatch(/translate/);
    }
  });

  it('has no transparent hit slop, so it never steals a tap meant for content, and a focus-visible ring class', () => {
    render(<FeedbackEdgeTab />);
    expect(screen.queryByTestId('feedback-edge-tab-hit-slop')).toBeNull();
    const anchor = screen.getByTestId('feedback-edge-tab-anchor');
    expect(anchor.className).toContain('[&:has(:focus-visible)]:outline');
  });
});
