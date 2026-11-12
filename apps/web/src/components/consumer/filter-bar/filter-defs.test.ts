import { describe, expect, it } from 'vitest';
import { BUCKET_LABELS, type VenuePublic } from '@concert-crawl/types';
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { vibeKind } from './VibeOptionGrid';
import {
  VIBE_ORDER,
  compareVenueNames,
  getActiveFilterCount,
  getActiveFilterLabel,
  getChipLabel,
  getFilterOptions,
  getFirstResolvedLabel,
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

  it('labels from the first pick that resolves when the first is stale', () => {
    // A venue since removed leaves its slug in a shared URL. The label skips
    // it rather than going blank, and the count still covers every pick.
    expect(getSegmentLabel('where', ['gone-venue', 'bluebird'], venues)).toBe(
      copy.segment.moreCount('Bluebird', 1),
    );
    expect(
      getFirstResolvedLabel('where', ['gone-venue', 'red-rocks'], venues),
    ).toEqual({ label: 'Red Rocks', rest: 1 });
    expect(getSegmentLabel('where', ['gone-venue'], venues)).toBeNull();
    expect(getChipLabel('where', ['gone-venue', 'bluebird'], venues)).toBe(
      '2 venues',
    );
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

describe('compareVenueNames', () => {
  it('ignores a leading "The", as bp-f-filt_where_d orders them', () => {
    const names = [
      'The Junkyard',
      'Bluebird Theater',
      'The Black Box',
      'Ball Arena',
      'Hi-Dive',
      'The Church Nightclub',
    ];
    expect([...names].sort(compareVenueNames)).toEqual([
      'Ball Arena',
      'The Black Box',
      'Bluebird Theater',
      'The Church Nightclub',
      'Hi-Dive',
      'The Junkyard',
    ]);
  });

  it('only drops "The" as a whole leading word', () => {
    expect(['Theatre X', 'The Ogden', 'Atlas'].sort(compareVenueNames)).toEqual(
      ['Atlas', 'The Ogden', 'Theatre X'],
    );
  });
});

describe('VIBE_ORDER', () => {
  it('follows the vibe_pop_d order, row by row', () => {
    expect(VIBE_ORDER.slice(0, 4)).toEqual([
      'electronic',
      'hip-hop',
      'pop',
      'indie',
    ]);
  });

  it('covers every vibe bucket and gives each its line', () => {
    expect([...VIBE_ORDER].sort()).toEqual([...BUCKET_LABELS]);
    for (const bucket of BUCKET_LABELS) {
      expect(vibeKind(bucket)).toBeTruthy();
      expect(vibeKind(bucket)).not.toContain('—');
    }
  });
});
