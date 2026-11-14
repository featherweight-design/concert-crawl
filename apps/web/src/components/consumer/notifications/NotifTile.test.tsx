// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CATEGORY_MAP } from './definitions/categories';
import { NotifTile } from './NotifTile';

// addendum-2 01-notification-tabs: a 30px tile at radius 9 filled with the
// border token; Tickets back on sale and Artist page fixed both draw a check.
describe('NotifTile', () => {
  it('fills with the border token at radius 9, no outline', () => {
    const { container } = render(<NotifTile category="watch.pricedrop" />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.style.borderRadius).toBe('9px');
    expect(tile.style.background).toBe('var(--border)');
    expect(tile.style.border).toBe('');
  });

  it('draws the same check for Tickets back and Artist page fixed', () => {
    expect(CATEGORY_MAP['watch.backonsale'].glyph).toBe('check');
    expect(CATEGORY_MAP['artist.report_fixed'].glyph).toBe('check');
  });
});
