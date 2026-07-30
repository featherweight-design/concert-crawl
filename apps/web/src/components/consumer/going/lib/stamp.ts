// Deterministic visual identity for a Concert History stamp (#70).
//
// The handoff (history-data.jsx:191-208) used FNV-1a for the accent and djb2
// for the glyph so the two would vary independently. The shipped
// `ia_hashName(name, namespace)` is FNV-1a with a namespace prefix, which buys
// the same independence from a single hash — two namespaces, two uncorrelated
// streams. Substituted deliberately so there is no second hash to maintain.

import { ia_hashName } from '../../identity-art/IdentityArt'

export type StampGlyph = 'star' | 'diamond' | 'ring' | 'triangle'

// Hex is allowed here because this is identity data, not theming — the same
// exception IA_PALETTES takes. Keep it out of components.
export const STAMP_ACCENTS = [
  '#7AE6FF',
  '#FF7BD4',
  '#FFE36B',
  '#A075FF',
  '#C9F26E',
  '#FFB838',
  '#5DD4D6',
] as const

export const STAMP_GLYPHS: readonly StampGlyph[] = [
  'star',
  'diamond',
  'ring',
  'triangle',
]

export const stampAccentFor = (artist: string): string =>
  STAMP_ACCENTS[ia_hashName(artist, 'stamp-accent') % STAMP_ACCENTS.length]!

export const stampGlyphFor = (artist: string): StampGlyph =>
  STAMP_GLYPHS[ia_hashName(artist, 'stamp-glyph') % STAMP_GLYPHS.length]!

/** Degrees of tilt, stable per event, within ±4 so a row of stamps reads hand-stamped. */
export const stampRotationFor = (eventId: string): number => {
  const span = 81 // -4.0 … +4.0 in 0.1deg steps
  const offset = ia_hashName(eventId, 'stamp-rotation') % span
  return Math.round((offset / 10 - 4) * 10) / 10
}
