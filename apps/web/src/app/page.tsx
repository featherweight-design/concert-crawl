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

async function fetchHeroShows(): Promise<LandingShow[]> {
  try {
    const result =
      await publicApiClient.get<EventsListResponse>('/v1/events?limit=4')
    if (!result?.data?.length) return []

    return result.data.map((row) => ({
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
  } catch (err) {
    if (!(err instanceof ApiError)) {
      console.error('[landing] unexpected error fetching hero shows:', err)
    }
    return []
  }
}

export const revalidate = 3600

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect('/events')

  const shows = await fetchHeroShows()
  return <LandingClientShell shows={shows} />
}
