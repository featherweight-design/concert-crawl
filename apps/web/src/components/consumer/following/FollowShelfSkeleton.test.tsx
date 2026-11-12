// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SHELF_CARD_BOX_CLASS } from '@/components/consumer/definitions/constants';
import { FollowShelfSkeleton } from './FollowShelfSkeleton';

// B+ `load_browse_m` / `load_browse_d`: the Coming to Denver shelf waits as
// eyebrow and title bars over tall card shapes, above the filter chrome.
describe('FollowShelfSkeleton', () => {
  it('is hidden from assistive tech', () => {
    render(<FollowShelfSkeleton />);
    expect(
      screen.getByTestId('follow-shelf-skeleton').getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it("matches ShelfHead's line boxes: 10px eyebrow, 5px gap, 15.5px title", () => {
    render(<FollowShelfSkeleton />);
    const lines = screen.getAllByTestId('follow-shelf-skeleton-line');
    expect(lines).toHaveLength(2);
    // 10 × 1.5 and 15.5 × 1.5: the inherited base line height.
    expect(lines.map((line) => line.style.height)).toEqual(['15px', '23.25px']);
    expect(lines[0]?.parentElement?.className).toContain('gap-[5px]');
    expect(screen.queryByTestId('follow-shelf-skeleton-body')).toBeNull();
  });

  it('adds the zero head body line at 12.5px / 1.45', () => {
    render(<FollowShelfSkeleton withBody />);
    const body = screen.getByTestId('follow-shelf-skeleton-body');
    const bodyLines = Array.from(body.children);
    expect(bodyLines.length).toBeGreaterThan(0);
    for (const line of bodyLines) {
      if (!(line instanceof HTMLElement)) throw new Error('not an element');
      // 12.5 × 1.45
      expect(line.style.height).toBe('18.125px');
    }
  });

  it('draws three cards at phone width and five from sm, in the live box', () => {
    render(<FollowShelfSkeleton />);
    const cards = screen.getAllByTestId('follow-shelf-skeleton-card');
    expect(cards).toHaveLength(5);
    expect(
      // `classList.contains`, not a substring: every card is overflow-hidden.
      cards.filter((card) => card.classList.contains('hidden')),
    ).toHaveLength(2);
    for (const card of cards) {
      for (const cls of SHELF_CARD_BOX_CLASS.split(' ')) {
        expect(card.classList.contains(cls)).toBe(true);
      }
      expect(card.className).toContain('rounded-[14px]');
      expect(card.style.border).toBe('1px solid var(--border)');
    }
  });
});
