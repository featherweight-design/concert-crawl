// @vitest-environment jsdom

import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DayTile } from './DayTile';

afterEach(() => {
  vi.useRealTimers();
});

describe('DayTile', () => {
  it('shows the weekday over the day number', () => {
    render(<DayTile date="2099-03-09" />);
    const tile = screen.getByTestId('day-tile');
    expect(tile.textContent).toBe('Mon9');
  });

  it('takes the gradient only for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-03-09T18:00:00Z'));
    const { rerender } = render(<DayTile date="2099-03-09" />);
    expect(screen.getByTestId('day-tile').style.background).toContain(
      'linear-gradient',
    );
    rerender(<DayTile date="2099-03-10" />);
    expect(screen.getByTestId('day-tile').style.background).toBe(
      'var(--fg-muted)',
    );
  });
});
