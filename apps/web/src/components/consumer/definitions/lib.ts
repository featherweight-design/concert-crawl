import { DENVER_TIME_ZONE } from '@/lib/time'

export function formatEventDate(
  dateStr: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  },
): string {
  // dateStr is YYYY-MM-DD — append T00:00 so Date parses in local context
  const date = new Date(`${dateStr}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: DENVER_TIME_ZONE,
    ...options,
  }).format(date)
}

export function formatShowTime(timeStr: string | null): string | null {
  if (!timeStr) return null
  // timeStr is HH:MM:SS from Postgres time column
  const [hours, minutes] = timeStr.split(':').map(Number)
  if (hours === undefined || minutes === undefined) return null
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
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

export function isToday(dateStr: string): boolean {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return dateStr === todayStr
}

export function isTomorrow(dateStr: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  return dateStr === tomorrowStr
}

export function dateGroupLabel(dateStr: string): string {
  if (isToday(dateStr)) return 'Tonight'
  if (isTomorrow(dateStr)) return 'Tomorrow'
  return formatEventDate(dateStr, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function artistInitial(artist: string): string {
  return artist.trim().charAt(0).toUpperCase()
}
