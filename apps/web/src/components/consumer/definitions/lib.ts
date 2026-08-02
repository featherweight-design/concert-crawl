import { localDateString } from '@/lib/time'

import { CONSUMER_COPY } from './copy'

// Concert Crawl is a Denver-only app — Mountain Time is the user's reference frame
// for "Today/Tonight" grouping labels and date display. The detail page passes
// event.venue.timezone explicitly for the rare cross-zone case.
const DEFAULT_DISPLAY_TIMEZONE = 'America/Denver'

export function formatEventDate(
  dateStr: string,
  timezone = DEFAULT_DISPLAY_TIMEZONE,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  },
): string {
  // dateStr is YYYY-MM-DD. Anchor to UTC noon so the parsed instant lands safely
  // mid-day in any IANA zone (T00:00 without timezone slips back a day in MT on a
  // UTC host, which was the original display-layer half of issue #596).
  const date = new Date(`${dateStr}T12:00:00Z`)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    ...options,
  }).format(date)
}

/**
 * Whether an event's date has already passed in the venue's own timezone.
 *
 * Both sides are YYYY-MM-DD, which sorts lexicographically, so no Date parsing
 * is involved and no host-timezone drift can creep in (#596). The comparison is
 * date-granular on purpose: a show is "past" only once its calendar day is over
 * in the venue's zone, so an 11pm set still counts as tonight.
 *
 * Used by the public share mirror to suppress a ticket CTA on a show that has
 * already happened — a poster link is often opened days after the gig, and a
 * "Get tickets" button pointing at a dead vendor page is worse than nothing.
 */
export function isEventPast(
  dateStr: string,
  timezone = DEFAULT_DISPLAY_TIMEZONE,
): boolean {
  return dateStr < localDateString(timezone)
}

export function formatShowTime(timeStr: string | null): string | null {
  if (!timeStr) return null
  // timeStr is HH:MM:SS from Postgres time column
  const [hours, minutes] = timeStr.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return null
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/**
 * One dollar amount, the way every consumer surface shows one. Prices reach the
 * client as `parseFloat` output, so rounding here is what stops a `$15.5` from
 * reaching a price chip on any surface that forgets to round for itself.
 */
export function formatDollars(value: number): string {
  if (value === 0) return CONSUMER_COPY.freeLabel
  return `$${value.toFixed(0)}`
}

export function formatPrice(
  min: string | null,
  max: string | null,
): string | null {
  if (!min && !max) return null
  const lo = min ? parseFloat(min) : null
  const hi = max ? parseFloat(max) : null
  if (lo === 0) return CONSUMER_COPY.freeLabel
  if (lo !== null && hi !== null && lo !== hi) {
    return `${formatDollars(lo)}–${formatDollars(hi)}`
  }
  if (lo !== null) return formatDollars(lo)
  if (hi !== null) return formatDollars(hi)
  return null
}

export function isToday(
  dateStr: string,
  timezone = DEFAULT_DISPLAY_TIMEZONE,
): boolean {
  return dateStr === localDateString(timezone)
}

export function isTomorrow(
  dateStr: string,
  timezone = DEFAULT_DISPLAY_TIMEZONE,
): boolean {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(Date.now() + 86_400_000))

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) return false
  return dateStr === `${year}-${month}-${day}`
}

export function dateGroupLabel(
  dateStr: string,
  timezone = DEFAULT_DISPLAY_TIMEZONE,
): string {
  if (isToday(dateStr, timezone)) return 'Tonight'
  if (isTomorrow(dateStr, timezone)) return 'Tomorrow'
  return formatEventDate(dateStr, timezone, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  })
}

export function venueShort(name: string): string {
  return name
    .replace(
      /\s+(Amphitheatre|Amphitheater|Theatre|Theater|Ballroom|Auditorium|Hall|Arena)$/i,
      '',
    )
    .trim()
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_DISPLAY_TIMEZONE,
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function googleMapsUrl(address: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`
}

export function googleMapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
}

export interface WeekDayInfo {
  date: string
  label: string
  dayOfMonth: string
}

export function currentWeekDays(
  timezone = 'America/Denver',
  weekOffset = 0,
): WeekDayInfo[] {
  const today = localDateString(timezone)
  // Parse from the localized string — avoids local-timezone shifts on UTC servers.
  const [year, month, day] = today.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  // Use UTC noon so DST transitions never push the date across a day boundary.
  const todayNoon = new Date(Date.UTC(year, month - 1, day, 12))
  const dow = todayNoon.getUTCDay() // 0 = Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  // Shift the entire week window by weekOffset weeks.
  const weekShift = weekOffset * 7

  return Array.from({ length: 7 }).map((_, index) => {
    const noon = new Date(
      Date.UTC(year, month - 1, day + mondayOffset + weekShift + index, 12),
    )
    const date = `${noon.getUTCFullYear()}-${String(noon.getUTCMonth() + 1).padStart(2, '0')}-${String(noon.getUTCDate()).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    }).format(noon)
    return { date, label, dayOfMonth: String(noon.getUTCDate()) }
  })
}

export interface CalendarWeekDayLite {
  date: string
  hasEvents: boolean
}

// Picks the calendar view's selected date when none is explicitly chosen.
// today-in-week is preferred over a non-today first-day-with-events because
// today is meaningful even when empty ("nothing tonight"); first-day-with-events
// only kicks in after week-arrow nav, where today isn't visible (#636).
export function pickCalendarSelectedDate(args: {
  weekDays: CalendarWeekDayLite[]
  userProvidedSelectedDate: string | undefined
  fromParam: string | undefined
  toParam: string | undefined
  today: string
}): string | undefined {
  const { weekDays, userProvidedSelectedDate, fromParam, toParam, today } = args

  if (
    typeof userProvidedSelectedDate === 'string' &&
    weekDays.some((day) => day.date === userProvidedSelectedDate)
  ) {
    return userProvidedSelectedDate
  }

  const fromMatch = weekDays.find((day) => day.date === fromParam)?.date
  if (fromMatch) return fromMatch

  const toMatch = weekDays.find((day) => day.date === toParam)?.date
  if (toMatch) return toMatch

  if (weekDays.some((day) => day.date === today)) return today

  const firstWithEvents = weekDays.find((day) => day.hasEvents)?.date
  if (firstWithEvents) return firstWithEvents

  return weekDays[0]?.date
}

export function filterWhenToDateRange(
  value: string,
  timezone = 'America/Denver',
): { from: string; to: string } | null {
  const today = localDateString(timezone)
  const [year, month, day] = today.split('-').map(Number) as [
    number,
    number,
    number,
  ]
  const noon = new Date(Date.UTC(year, month - 1, day, 12))
  const dow = noon.getUTCDay()

  const isoDate = (base: Date, offsetDays: number): string => {
    const shifted = new Date(
      Date.UTC(
        base.getUTCFullYear(),
        base.getUTCMonth(),
        base.getUTCDate() + offsetDays,
        12,
      ),
    )
    return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
  }

  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const sundayOffset = dow === 0 ? 0 : 7 - dow
  const satOffset = dow === 0 ? -1 : 6 - dow

  const isWeekend = dow === 0 || dow === 6

  switch (value) {
    case 'tonight':
      return { from: today, to: today }
    case 'this-week':
      return {
        from: today,
        to: isoDate(noon, sundayOffset),
      }
    case 'this-weekend':
      return {
        from: isWeekend ? today : isoDate(noon, satOffset),
        to: isoDate(noon, sundayOffset),
      }
    case 'next-week':
      return {
        from: isoDate(noon, mondayOffset + 7),
        to: isoDate(noon, sundayOffset + 7),
      }
    default:
      return null
  }
}
