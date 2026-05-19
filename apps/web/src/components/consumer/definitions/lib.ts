import { localDateString } from '@/lib/time'

export function formatEventDate(
  dateStr: string,
  timezone = 'UTC',
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  },
): string {
  // dateStr is YYYY-MM-DD — append T00:00 so Date parses in local context
  const date = new Date(`${dateStr}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    ...options,
  }).format(date)
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

export function formatPrice(
  min: string | null,
  max: string | null,
): string | null {
  if (!min && !max) return null
  const lo = min ? parseFloat(min) : null
  const hi = max ? parseFloat(max) : null
  if (lo === 0) return 'Free'
  if (lo !== null && hi !== null && lo !== hi) {
    return `$${lo.toFixed(0)}–$${hi.toFixed(0)}`
  }
  if (lo !== null) return `$${lo.toFixed(0)}`
  if (hi !== null) return `$${hi.toFixed(0)}`
  return null
}

export function isToday(dateStr: string, timezone = 'UTC'): boolean {
  return dateStr === localDateString(timezone)
}

export function isTomorrow(dateStr: string, timezone = 'UTC'): boolean {
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

export function dateGroupLabel(dateStr: string, timezone = 'UTC'): string {
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
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
