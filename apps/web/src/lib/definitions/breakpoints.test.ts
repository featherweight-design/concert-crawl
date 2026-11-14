import { describe, expect, it } from 'vitest';

import { DESKTOP_VIEWPORT_QUERY, MOBILE_VIEWPORT_QUERY } from './breakpoints';

// Tablet option A (Hugh, 2026-11-14): the phone layout holds up to 1023px.
describe('viewport queries', () => {
  it('splits phone and desktop at 1024 with no gap and no overlap', () => {
    expect(MOBILE_VIEWPORT_QUERY).toBe('(max-width: 1023px)');
    expect(DESKTOP_VIEWPORT_QUERY).toBe('(min-width: 1024px)');
  });
});
