// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { StatPill } from './StatPill';

afterEach(cleanup);

// A long single word (a venue type) scales to its column and never breaks
// mid-word; a short value keeps the full size.
describe('StatPill', () => {
  it.each(['Amphitheatre', 'Auditorium', 'Amphitheater'])(
    'never breaks %s mid-word and never truncates it',
    (type) => {
      render(<StatPill label="Type" value={type} />);
      const value = screen.getByTestId('stat-value');
      expect(value.textContent).toBe(type);
      expect(value).not.toHaveClass('truncate');
      expect(value.style.whiteSpace).not.toBe('nowrap');
      expect(value.style.textOverflow).toBe('');
      expect(value.style.overflowWrap).toBe('normal');
      expect(value.dataset.longWord).toBe('true');
      expect(value.style.fontSize).toBe('clamp(13px, 12.5cqw, 22px)');
    },
  );

  it('keeps a short value at its full size', () => {
    render(<StatPill label="Type" value="Club" />);
    const value = screen.getByTestId('stat-value');
    expect(value.style.fontSize).toBe('22px');
    expect(value.dataset.longWord).toBeUndefined();
  });
});
