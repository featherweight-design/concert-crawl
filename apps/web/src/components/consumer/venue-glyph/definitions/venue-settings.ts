import type { VenueGlyphKey } from './glyphs';

/** The backdrop family a venue's hero art is drawn on. */
export type VenueHeroSetting = 'street' | 'outdoor' | 'arena';

/**
 * Which backdrop each venue's hero sits on, as the B+ board draws it
 * (`design/design_handoff_bplus_redesign/screens/10-venue-art/hero-all.jpg`,
 * "Venue hero, all 21"). The board assigns by venue, so this is deliberately
 * NOT derived from `venues.venue_type`: Summit Music Hall is outdoor, and
 * Mission Ballroom and Meow Wolf are arena. Typed as a Record over the glyph
 * keys so a new glyph fails typecheck until it is placed here.
 */
export const VENUE_HERO_SETTINGS: Readonly<
  Record<VenueGlyphKey, VenueHeroSetting>
> = {
  ballarena: 'arena',
  mission: 'arena',
  meowwolf: 'arena',
  fiddlers: 'outdoor',
  junkyard: 'outdoor',
  levitt: 'outdoor',
  redrocks: 'outdoor',
  summit: 'outdoor',
  blackbox: 'street',
  bluebird: 'street',
  cervantes: 'street',
  church: 'street',
  fillmore: 'street',
  globe: 'street',
  gothic: 'street',
  hidive: 'street',
  larimer: 'street',
  lostlake: 'street',
  marquis: 'street',
  ogden: 'street',
  oriental: 'street',
};
