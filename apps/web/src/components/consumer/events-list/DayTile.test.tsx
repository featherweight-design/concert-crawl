// @vitest-environment jsdom

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayTile, MONTH_TILE_SIZE } from './DayTile';

describe('DayTile', () => {
  it('shows the weekday over the day number', () => {
    render(<DayTile date="2099-03-09" today={false} />);
    const tile = screen.getByTestId('day-tile');
    expect(tile.textContent).toBe('Mon9');
  });

  it('takes the gradient only for today', () => {
    const { rerender } = render(<DayTile date="2099-03-09" today />);
    expect(screen.getByTestId('day-tile').style.background).toContain(
      'linear-gradient',
    );
    rerender(<DayTile date="2099-03-10" today={false} />);
    expect(screen.getByTestId('day-tile').style.background).toBe(
      'var(--fg-muted)',
    );
  });

  it('adds the month and takes a tinted gradient for a show tile', () => {
    render(
      <DayTile
        date="2099-03-09"
        today={false}
        month
        tint="var(--genre-soul)"
      />,
    );
    const tile = screen.getByTestId('day-tile');
    expect(tile.textContent).toBe('Mon9Mar');
    expect(tile.style.background).toContain('var(--genre-soul)');
    // 48 × 58 on mobile, 56 × 62 from md (B+ `09-artist` boards).
    expect(tile.className).toContain(MONTH_TILE_SIZE);
    expect(tile.style.height).toBe('');
  });
});
