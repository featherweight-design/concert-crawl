// @vitest-environment jsdom

import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayTile } from './DayTile';

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
});
