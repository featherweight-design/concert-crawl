// The stamp accent: one deterministic ink colour per seed, shared by the
// ticket-stub `StubStamp` (#70) and the B+ `VenueStamp` so a show keeps its
// colour when B12 swaps one stamp for the other.
//
// `ia_hashName` is FNV-1a with a namespace prefix; the `stamp-accent`
// namespace keeps the accent independent of the stub's glyph stream.

import { ia_hashName } from '@/components/consumer/identity-art/IdentityArt';

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
] as const;

export const stampAccentFor = (seed: string): string =>
  STAMP_ACCENTS[ia_hashName(seed, 'stamp-accent') % STAMP_ACCENTS.length]!;
