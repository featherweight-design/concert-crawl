import { describe, expect, it } from 'vitest';
import type { VenuePublic } from '@concert-crawl/types';
import { getActiveFilterLabel, getFilterOptions } from './filter-defs';

const venues = [
  { slug: 'bluebird', name: 'Bluebird Theater' },
  { slug: 'red-rocks', name: 'Red Rocks Amphitheatre' },
] as unknown as VenuePublic[];

describe('getActiveFilterLabel — where', () => {
  it('returns the short venue name for the active segment and chip', () => {
    expect(getActiveFilterLabel('where', 'bluebird', venues)).toBe('Bluebird');
    expect(getActiveFilterLabel('where', 'red-rocks', venues)).toBe(
      'Red Rocks',
    );
  });

  it('returns null for an unknown venue', () => {
    expect(getActiveFilterLabel('where', 'nope', venues)).toBeNull();
  });

  it('keeps the full name on popover rows', () => {
    expect(getFilterOptions('where', venues).map((opt) => opt.label)).toEqual([
      'Bluebird Theater',
      'Red Rocks Amphitheatre',
    ]);
  });
});
