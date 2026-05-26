import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
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

function futureDateString(daysFromNow: number): string {
  const dd = new Date()
  dd.setDate(dd.getDate() + daysFromNow)
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

export const revalidate = 3600

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect('/events')

  const shows = await fetchHeroShows()
  return <LandingClientShell shows={shows} />
}
