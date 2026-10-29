import LandingClientShell from './_components/LandingClientShell'
import { publicApiClient, ApiError } from '@/lib/api'
import type { EventsListResponse } from '@concert-crawl/types'
import type { LandingShow } from '@/components/brand/landing-poster/LandingPoster'

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const

function formatShowTime(time: string | null | undefined): string {
  if (!time) return ''
  const parts = time.split(':')
  const hoursStr = parts[0] ?? '0'
  const minutesStr = parts[1] ?? '00'
  const hours = parseInt(hoursStr, 10)
  const minutes = parseInt(minutesStr, 10)
  const period = hours >= 12 ? 'pm' : 'am'
  const displayHours = hours % 12 || 12
  return minutes === 0
    ? `${displayHours}${period}`
    : `${displayHours}:${minutesStr}${period}`
}

function formatDateShort(date: string): string {
  const dd = new Date(date + 'T12:00:00')
  const month = MONTHS[dd.getMonth()]
  return `${month} ${dd.getDate().toString().padStart(2, '0')}`
}

// Day arithmetic and serialization both run in UTC. Mixing local setDate with
// a UTC toISOString slice shifts the YYYY-MM-DD by a day depending on the
// runtime's timezone and time of day, which would skew the "this week" count.
function futureDateString(daysFromNow: number): string {
  const dd = new Date()
  dd.setUTCDate(dd.getUTCDate() + daysFromNow)
  return dd.toISOString().slice(0, 10)
}

function makeFallbackShows(): LandingShow[] {
  const dateAt = (offset: number) => futureDateString(offset)
  return [
    {
      id: 'fallback-1',
      artist: 'Amyl and The Sniffers',
      venue: 'Ogden Theatre',
      city: 'Denver, CO',
      date: dateAt(1),
      dateShort: formatDateShort(dateAt(1)),
      showTime: '8pm',
      opener: 'C.O.F.F.I.N.',
      state: null,
    },
    {
      id: 'fallback-2',
      artist: 'Wednesday',
      venue: 'Globe Hall',
      city: 'Denver, CO',
      date: dateAt(3),
      dateShort: formatDateShort(dateAt(3)),
      showTime: '9pm',
      opener: 'Truth Club',
      state: null,
    },
    {
      id: 'fallback-3',
      artist: 'Geese',
      venue: 'Larimer Lounge',
      city: 'Denver, CO',
      date: dateAt(5),
      dateShort: formatDateShort(dateAt(5)),
      showTime: '8pm',
      opener: null,
      state: null,
    },
    {
      id: 'fallback-4',
      artist: 'Mannequin Pussy',
      venue: 'Marquis Theater',
      city: 'Denver, CO',
      date: dateAt(7),
      dateShort: formatDateShort(dateAt(7)),
      showTime: '7pm',
      opener: 'Soul Glo',
      state: null,
    },
  ]
}

async function fetchHeroShows(): Promise<LandingShow[]> {
  try {
    const result =
      await publicApiClient.get<EventsListResponse>('/v1/events?limit=4')
    if (!result?.data?.length) return makeFallbackShows()

    const mapped = result.data.map((row) => ({
      id: row.id,
      artist: row.artist,
      venue: row.venue.name,
      city: row.venue.city,
      date: row.date,
      dateShort: formatDateShort(row.date),
      showTime: formatShowTime(row.showTime),
      opener: null,
      state: null,
      href: `/events/${row.id}`,
    }))

    return mapped.length >= 2 ? mapped : makeFallbackShows()
  } catch (err) {
    console.error(
      '[landing] failed to fetch hero shows:',
      err instanceof ApiError ? `HTTP ${err.status} ${err.message}` : err,
    )
    return makeFallbackShows()
  }
}

// The see-all rail says "this week", so the count has to mean that too — a
// separate `to`-bounded probe rather than the unbounded hero fetch's total.
// Returns null on any failure so the rail ships its countless variant instead
// of a wrong number.
async function fetchWeekCount(): Promise<number | null> {
  try {
    const result = await publicApiClient.get<EventsListResponse>(
      `/v1/events?limit=1&to=${futureDateString(6)}`,
    )
    return typeof result?.total === 'number' ? result.total : null
  } catch (err) {
    console.error(
      '[landing] failed to fetch this-week count:',
      err instanceof ApiError ? `HTTP ${err.status} ${err.message}` : err,
    )
    return null
  }
}

// ISR window: 5 minutes (#842). The crawler triggers every 10 min, so a 5-min
// window always catches new events within one cycle. The logged-in redirect to
// /events lives in proxy.ts — keeping it out of this server component is
// what makes the page ISR-eligible (calling auth() / cookies() here would force
// Next.js to render dynamically on every request). If a future change adds
// user-personalized rendering, split it into an ISR shell + a Client Component
// island rather than dropping ISR entirely.
export const revalidate = 300

export default async function LandingPage() {
  const [shows, weekCount] = await Promise.all([
    fetchHeroShows(),
    fetchWeekCount(),
  ])
  return <LandingClientShell shows={shows} showCount={weekCount} />
}
