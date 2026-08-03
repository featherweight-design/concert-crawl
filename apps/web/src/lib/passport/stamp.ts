import { PASSPORT_COPY } from '@/components/consumer/passport/definitions/copy'
import { DENVER_TIME_ZONE } from '@/lib/time'

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
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  return ((Math.abs(hash) % 9) - 4) * 0.55
}

export interface StampDateParts {
  /** Uppercase short month, e.g. `FEB`. */
  month: string
  /** Zero-padded day of month, e.g. `28`. */
  day: string
}

const STAMP_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: DENVER_TIME_ZONE,
  month: 'short',
  day: '2-digit',
})

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
  const at = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(at.getTime())) return null

  const parts = STAMP_FORMAT.formatToParts(at)
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (month === undefined || day === undefined) return null

  return { month: month.toUpperCase(), day }
}

/**
 * The handle printed on the card.
 *
 * `user_profiles.handle` is nullable, so the prototype's unguarded
 * `.replace()` on it is a real production crash, not a fixture artefact. The
 * Passport is an account artifact by definition — there is no anonymous
 * variant — so an absent handle falls back rather than suppressing the header.
 */
export const passportHandle = (handle: string | null | undefined): string => {
  const trimmed = handle?.trim() ?? ''
  if (trimmed === '' || trimmed === '@') return PASSPORT_COPY.fallbackHandle
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}
