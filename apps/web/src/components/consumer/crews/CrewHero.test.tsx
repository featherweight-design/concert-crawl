import { describe, expect, it } from 'vitest';
import { SPOKE_ENDS } from './CrewHero';

// The crew home failed hydration on every load: Node and the browser put a
// spoke's y2 at ...6623 and ...6624. Two-decimal coordinates are identical on
// both sides.
describe('CrewHero spoke ends', () => {
  it('rounds every coordinate to at most two decimals', () => {
    for (const end of SPOKE_ENDS) {
      for (const value of [end.x1, end.y1, end.x2, end.y2]) {
        expect(Math.round(value * 100) / 100).toBe(value);
      }
    }
  });
});
