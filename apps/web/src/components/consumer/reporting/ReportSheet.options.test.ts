import { describe, expect, it } from 'vitest';
import { getVisibleOptions } from './ReportSheet';

// B+ A3: Tickets available clears a promoted sold-out and nothing else, so it
// is offered only while sold out is live.
describe('getVisibleOptions', () => {
  it('offers Tickets available on a live sold-out', () => {
    expect(getVisibleOptions('sold-out')).toContain('available');
  });

  it('withholds it while the sold-out is still pending', () => {
    expect(getVisibleOptions('sold-out', true)).not.toContain('available');
  });

  it('withholds it on a postponed show', () => {
    expect(getVisibleOptions('postponed')).toEqual(['cancelled']);
  });

  it('leaves a cancelled show with nothing to report', () => {
    expect(getVisibleOptions('cancelled')).toEqual([]);
  });
});
