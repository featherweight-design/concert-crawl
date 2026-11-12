import { describe, it, expect } from 'vitest';

import { VENUE_GLYPH_KEYS } from './glyphs';
import { VENUE_SLUG_GLYPHS } from './venue-glyph-keys';
import { VENUE_HERO_SETTINGS, type VenueHeroSetting } from './venue-settings';

function keysFor(setting: VenueHeroSetting): string[] {
  return VENUE_GLYPH_KEYS.filter((key) => VENUE_HERO_SETTINGS[key] === setting)
    .slice()
    .sort();
}

describe('VENUE_HERO_SETTINGS', () => {
  it('places every venue slug glyph key', () => {
    for (const key of Object.values(VENUE_SLUG_GLYPHS)) {
      expect(VENUE_HERO_SETTINGS[key]).toBeDefined();
    }
  });

  it('matches the board assignment for all 21', () => {
    expect(keysFor('arena')).toEqual(['ballarena', 'meowwolf', 'mission']);
    expect(keysFor('outdoor')).toEqual([
      'fiddlers',
      'junkyard',
      'levitt',
      'redrocks',
      'summit',
    ]);
    expect(keysFor('street')).toEqual([
      'blackbox',
      'bluebird',
      'cervantes',
      'church',
      'fillmore',
      'globe',
      'gothic',
      'hidive',
      'larimer',
      'lostlake',
      'marquis',
      'ogden',
      'oriental',
    ]);
    expect(Object.keys(VENUE_HERO_SETTINGS)).toHaveLength(21);
  });
});
