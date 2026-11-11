// Deterministic visual identity for a Concert History stamp (#70).
//
// The handoff (history-data.jsx:191-208) used FNV-1a for the accent and djb2
// for the glyph so the two would vary independently. The shipped
// `ia_hashName(name, namespace)` is FNV-1a with a namespace prefix, which buys
// the same independence from a single hash — two namespaces, two uncorrelated
// streams. Substituted deliberately so there is no second hash to maintain.

import { ia_hashName } from '../../identity-art/IdentityArt';

// The accent lives in the shared helper so VenueStamp picks the same colour.
export { STAMP_ACCENTS, stampAccentFor } from '@/lib/stamp-accent';

export type StampGlyph = 'star' | 'diamond' | 'ring' | 'triangle';

export const STAMP_GLYPHS: readonly StampGlyph[] = [
  'star',
  'diamond',
  'ring',
  'triangle',
];

export const stampGlyphFor = (artist: string): StampGlyph =>
  STAMP_GLYPHS[ia_hashName(artist, 'stamp-glyph') % STAMP_GLYPHS.length]!;

/** Degrees of tilt, stable per event, within ±4 so a row of stamps reads hand-stamped. */
export const stampRotationFor = (eventId: string): number => {
  const span = 81; // -4.0 … +4.0 in 0.1deg steps
  const offset = ia_hashName(eventId, 'stamp-rotation') % span;
  return Math.round((offset / 10 - 4) * 10) / 10;
};
