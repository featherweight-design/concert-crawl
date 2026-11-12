import { describe, expect, it } from 'vitest';
import type { VenuePublic } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import {
  getActiveFilterCount,
  getActiveFilterLabel,
  getChipLabel,
  getFilterOptions,
  getSegmentLabel,
  toggleValue,
} from './filter-defs';

const copy = CONSUMER_COPY.filterBar;

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

describe('multi-select labels (addendum 2, item 6)', () => {
  it('the segment names the first pick and counts the rest', () => {
    expect(getSegmentLabel('where', ['bluebird'], venues)).toBe('Bluebird');
    expect(getSegmentLabel('where', ['bluebird', 'red-rocks'], venues)).toBe(
      copy.segment.moreCount('Bluebird', 1),
    );
    expect(copy.segment.moreCount('Bluebird', 1)).toBe('Bluebird +1');
    expect(getSegmentLabel('vibe', ['electronic', 'indie'], venues)).toBe(
      'Electronic +1',
    );
    expect(getSegmentLabel('where', [], venues)).toBeNull();
  });

  it('the phone chip counts several picks and names a single one', () => {
    expect(getChipLabel('where', ['bluebird', 'red-rocks'], venues)).toBe(
      '2 venues',
    );
    expect(getChipLabel('vibe', ['electronic', 'indie'], venues)).toBe(
      '2 vibes',
    );
    expect(getChipLabel('where', ['red-rocks'], venues)).toBe('Red Rocks');
    expect(getChipLabel('vibe', ['electronic'], venues)).toBe('Electronic');
  });

  it('toggles a value on and off', () => {
    expect(toggleValue([], 'indie')).toEqual(['indie']);
    expect(toggleValue(['indie'], 'punk')).toEqual(['indie', 'punk']);
    expect(toggleValue(['indie', 'punk'], 'indie')).toEqual(['punk']);
  });

  it('counts a dimension once however many values it holds', () => {
    expect(
      getActiveFilterCount({
        when: [],
        where: ['bluebird', 'red-rocks'],
        price: ['under-25'],
        vibe: [],
      }),
    ).toBe(2);
  });
});
