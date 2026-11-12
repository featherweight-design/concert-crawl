// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StatPill } from './StatPill';

afterEach(cleanup);

// Design addendum 2 (#178) item 17: a stat value that doesn't fit its column
// wraps to a second line. It never shrinks and never truncates.
describe('StatPill', () => {
  it('wraps a long value instead of truncating it', () => {
    render(<StatPill label="Type" value="Amphitheater" />);
    const value = screen.getByTestId('stat-value');
    expect(value.textContent).toBe('Amphitheater');
    expect(value).not.toHaveClass('truncate');
    expect(value.style.whiteSpace).not.toBe('nowrap');
    expect(value.style.textOverflow).toBe('');
    expect(value.style.overflowWrap).toBe('break-word');
  });

  it('keeps the value at its full size', () => {
    render(<StatPill label="Type" value="Amphitheater" />);
    expect(screen.getByTestId('stat-value').style.fontSize).toBe('22px');
  });
});
