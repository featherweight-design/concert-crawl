import { ia_hashName } from '@/components/consumer/identity-art/IdentityArt';
import { PASSPORT_COPY } from '@/components/consumer/passport/definitions/copy';
import { VENUE_GLYPHS } from '@/components/consumer/venue-glyph/definitions/glyphs';
import { venueGlyphKey } from '@/components/consumer/venue-glyph/definitions/venue-glyph-keys';
import { DENVER_TIME_ZONE } from '@/lib/time';

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

/**
 * An accent from the palette above, stable per seed. The event page's going
 * stub hashes the artist through it; a stamp uses it only for a venue that has
 * no glyph yet (see `stampColorsFor`). The `stamp-accent` namespace keeps it
 * independent of the going button's glyph stream.
 */
export const stampAccentFor = (seed: string): string =>
  STAMP_ACCENTS[ia_hashName(seed, 'stamp-accent') % STAMP_ACCENTS.length]!;

export interface StampColors {
  /** The rings, the inscriptions and anything "filled with the stamp's colour". */
  ring: string;
  /** The venue glyph at the centre. */
  glyph: string;
}

/**
 * A stamp's colours, from its venue (B+ addendum 3 rule 4: "filled in the
 * venue's stamp color"). The boards draw the rings and text in the venue's
 * `to` colour and the glyph in its `from`, both as pure hex: no mix toward
 * `--fg`. Every stamp board is on a dark theme, so the Light theme takes the
 * same hex until Design draws it.
 *
 * A venue with no glyph yet has no venue colours, so it takes one accent from
 * the existing stamp palette, hashed on its slug: still one colour per venue,
 * whoever played.
 */
export const stampColorsFor = (venueSlug: string): StampColors => {
  const key = venueGlyphKey(venueSlug);
  if (key === null) {
    const accent = stampAccentFor(venueSlug);
    return { ring: accent, glyph: accent };
  }
  const { from, to } = VENUE_GLYPHS[key];
  return { ring: to, glyph: from };
};

/**
 * The boards' stamp glow, `drop-shadow(0 0 Npx <ring> at 30%)`. The ring is
 * always a six-digit hex, so the alpha is appended as two hex digits (0x4D).
 */
export const stampGlowFor = (ring: string, blur: number): string =>
  `drop-shadow(0 0 ${blur}px ${ring}4D)`;

/**
 * Deterministic ±2° tilt per show, so the wall reads as stamped rather than
 * gridded — and reads the *same* way on every render. A random tilt would give
 * the in-app preview and the PNG two different cards.
 *
 * The magnitude is taken before the modulo. The prototype used `hash % 9` on a
 * signed hash, and JS keeps the sign there, so roughly half of all ids landed
 * in −6.6°…−2.2° — three times the tilt the design asks for, in one direction
 * only. The wall visibly leaned. Bucketing on `Math.abs` restores the stated
 * ±2.2° and keeps the tilt evenly spread across the nine buckets.
 */
export const passportRotation = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return ((Math.abs(hash) % 9) - 4) * 0.55;
};

export interface StampDateParts {
  /** Uppercase short month, e.g. `FEB`. */
  month: string;
  /** Zero-padded day of month, e.g. `28`. */
  day: string;
}

const STAMP_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: DENVER_TIME_ZONE,
  month: 'short',
  day: '2-digit',
});

/**
 * The date punched into a stamp, from the event's local `YYYY-MM-DD`.
 *
 * Anchored at UTC noon per the #596 convention, so the instant lands mid-day in
 * any IANA zone and the formatted day can never slip to the adjacent one. Both
 * parts come from a single `formatToParts` pass: the prototype
 * (`passport-card.jsx:63`) took the month in Denver but the day from
 * `getUTCDate()`, so near a month boundary the stamp read a month and a day
 * that never occurred together.
 */
export const stampDateParts = (date: string): StampDateParts | null => {
  const at = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(at.getTime())) return null;

  const parts = STAMP_FORMAT.formatToParts(at);
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (month === undefined || day === undefined) return null;

  return { month: month.toUpperCase(), day };
};

/**
 * The handle printed on the card.
 *
 * `user_profiles.handle` is nullable, so the prototype's unguarded
 * `.replace()` on it is a real production crash, not a fixture artefact. The
 * Passport is an account artifact by definition — there is no anonymous
 * variant — so an absent handle falls back rather than suppressing the header.
 */
export const passportHandle = (handle: string | null | undefined): string => {
  const trimmed = handle?.trim() ?? '';
  if (trimmed === '' || trimmed === '@') return PASSPORT_COPY.fallbackHandle;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
};

const SINCE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: DENVER_TIME_ZONE,
  month: 'short',
  year: 'numeric',
});

/**
 * `Mar 2026` for the first night on the passport. Shared by the PNG card's
 * footer and the booklet's identity page. UTC-noon anchored for the same
 * reason as the stamp punch (#596).
 */
export const sinceLabel = (date: string | undefined): string | null => {
  if (date === undefined) return null;
  const at = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(at.getTime()) ? null : SINCE_FORMAT.format(at);
};
