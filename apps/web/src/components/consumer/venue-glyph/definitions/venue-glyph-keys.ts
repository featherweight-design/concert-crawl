import type { VenueGlyphKey } from './glyphs';

/**
 * Venue slug (the `venues.slug` column) to its glyph key. The asset keys are
 * short and the slugs are long, so the mapping is explicit rather than derived.
 * Prod and staging both held exactly these 21 active venues on 2026-11-10. A new
 * venue renders the fallback tile until it gets a glyph and a line here.
 */
export const VENUE_SLUG_GLYPHS: Readonly<Record<string, VenueGlyphKey>> = {
  'ball-arena': 'ballarena',
  'bluebird-theater': 'bluebird',
  'cervantes-masterpiece-ballroom': 'cervantes',
  'fiddlers-green-amphitheatre': 'fiddlers',
  'fillmore-auditorium': 'fillmore',
  'globe-hall': 'globe',
  'gothic-theatre': 'gothic',
  'hi-dive': 'hidive',
  'larimer-lounge': 'larimer',
  'levitt-pavilion': 'levitt',
  'lost-lake-lounge': 'lostlake',
  'marquis-theater': 'marquis',
  'meow-wolf-denver': 'meowwolf',
  'mission-ballroom': 'mission',
  'ogden-theatre': 'ogden',
  'oriental-theater': 'oriental',
  'red-rocks-amphitheatre': 'redrocks',
  'summit-music-hall': 'summit',
  'the-black-box': 'blackbox',
  'the-church-nightclub': 'church',
  'the-junkyard': 'junkyard',
};

export function venueGlyphKey(slug: string): VenueGlyphKey | null {
  return Object.hasOwn(VENUE_SLUG_GLYPHS, slug)
    ? VENUE_SLUG_GLYPHS[slug]!
    : null;
}
