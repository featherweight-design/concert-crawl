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

  it('draws three cards at phone width and five from sm, in the live box', () => {
    render(<FollowShelfSkeleton />);
    const cards = screen.getAllByTestId('follow-shelf-skeleton-card');
    expect(cards).toHaveLength(5);
    expect(
      cards.filter((card) => card.className.includes('hidden')),
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
