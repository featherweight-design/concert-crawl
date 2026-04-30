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
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function artistInitial(artist: string): string {
  return artist.trim().charAt(0).toUpperCase()
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
