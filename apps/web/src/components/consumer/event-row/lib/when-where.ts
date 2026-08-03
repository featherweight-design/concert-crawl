/**
 * Line 3's degradation ladder — "when · where".
 *
 * The line drops whole units rather than letting anything cross a clip edge.
 * The date is the last thing standing, because the bug that motivated this
 * whole system was a Watching row truncating the date away.
 *
 *   0  full date · time · venue    venue ellipsises under pressure
 *   1  short date · time · venue   "Sat, Aug 15" → "Aug 15"
 *   2  short date · time           venue AND its separator drop as one unit
 *   3  short date                  time drops
 *
 * The level comes from measurement, never from a caller's `narrow` flag —
 * deriving it from `narrow` is what clipped the 390 Watching list, which
 * never passed the flag.
 */

export const WHEN_WHERE_LEVELS = [0, 1, 2, 3] as const
export type WhenWhereLevel = (typeof WHEN_WHERE_LEVELS)[number]

export interface WhenWhereWidths {
  /** "Sat, Aug 15" */
  fullDate: number
  /** "Aug 15" */
  shortDate: number
  time: number
  /** One separator glyph plus the flex gap on each side of it. */
  separator: number
}

export interface WhenWhereUnits {
  showsDate: boolean
  showsTime: boolean
  showsVenue: boolean
}

/**
 * Width the level needs before the venue gets any space at all. The venue is
 * the only unit allowed to ellipsis, so it contributes nothing to the floor —
 * a level "fits" when everything that cannot shrink fits.
 */
export function requiredWidth(
  level: WhenWhereLevel,
  widths: WhenWhereWidths,
  units: WhenWhereUnits,
): number {
  const withVenue = units.showsVenue && level < 2
  const withTime = units.showsTime && level < 3
  const date = level >= 1 ? widths.shortDate : widths.fullDate

  let total = units.showsDate ? date : 0
  if (withTime) {
    total += widths.time + (units.showsDate ? widths.separator : 0)
  }
  // The venue's separator belongs to the venue unit — they drop together.
  if (withVenue && total > 0) total += widths.separator
  return total
}

export function chooseLevel(
  widths: WhenWhereWidths,
  available: number,
  units: WhenWhereUnits,
): WhenWhereLevel {
  // Pre-layout. Level 0 is the honest default; the observer re-runs on measure.
  if (available <= 0) return 0

  for (const level of WHEN_WHERE_LEVELS) {
    if (requiredWidth(level, widths, units) <= available + 0.5) return level
  }
  return 3
}

/**
 * "Sat, Aug 15" → "Aug 15". Level 1 changes the date's format; it never
 * truncates it, so this drops the weekday as a whole token or does nothing.
 */
export function shortenDate(dateLabel: string): string {
  return dateLabel.replace(/^[A-Za-z]{3,9},\s*/, '')
}
