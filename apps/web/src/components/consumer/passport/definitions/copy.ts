/**
 * Every string the Passport prints.
 *
 * The card is rendered server-side into a PNG, so a typo here ships inside an
 * image that is then cached — there is no DOM to inspect and no way for a
 * reader to select the text and tell us it is wrong.
 */
export const PASSPORT_COPY = {
  /** Header eyebrow. The year is appended by the card. */
  eyebrow: 'PASSPORT',
  /** Printed when the account has no handle. The Passport is never anonymous. */
  fallbackHandle: '@you',
  moreTile: 'MORE',
  statNight: 'night',
  statNights: 'nights',
  statVenue: 'venue',
  statVenues: 'venues',
  statTopGenre: 'top genre',
  /** Stands in for the top genre before anything has been genred. */
  noGenre: '—',
  /** Footer tag before any attended show exists to date the passport from. */
  footerNoHistory: 'YOUR YEAR IN SHOWS',
  /** Footer tag prefix, e.g. `SINCE MAR 2026`. */
  footerSincePrefix: 'SINCE',
} as const
