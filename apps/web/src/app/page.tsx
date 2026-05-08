import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import LandingClientShell from './_components/LandingClientShell'
import { publicApiClient, ApiError } from '@/lib/api'
import type { EventsListResponse } from '@concert-crawl/types'
import type { Show } from '@/components/brand/gig-poster/GigPoster'

const FALLBACK_SHOWS: Show[] = [
  {
    artist: 'Amyl and The Sniffers',
    venue: 'Ogden Theatre',
    date: '2026-05-23',
    time: '8pm',
    opener: 'C.O.F.F.I.N.',
  },
  {
    artist: 'Wednesday',
    venue: 'Globe Hall',
    date: '2026-05-24',
    time: '9pm',
    opener: 'Truth Club',
  },
  {
    artist: 'Geese',
    venue: 'Larimer Lounge',
    date: '2026-05-25',
    time: '8pm',
    opener: null,
  },
  {
    artist: 'Mannequin Pussy',
    venue: 'Marquis Theater',
    date: '2026-05-27',
    time: '7pm',
    opener: 'Soul Glo',
  },
]

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

async function fetchHeroShows(): Promise<Show[]> {
  try {
    const result =
      await publicApiClient.get<EventsListResponse>('/v1/events?limit=4')
    if (!result?.data?.length) return FALLBACK_SHOWS

    const mapped = result.data.map((row) => ({
      artist: row.artist,
      venue: row.venue.name,
      date: row.date,
      time: formatShowTime(row.showTime),
      opener: null as string | null,
    }))

    return mapped.length >= 2 ? mapped : FALLBACK_SHOWS
  } catch (err) {
    if (!(err instanceof ApiError)) {
      console.error('[landing] unexpected error fetching hero shows:', err)
    }
    return FALLBACK_SHOWS
  }
}

export const revalidate = 3600

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect('/events')

  const shows = await fetchHeroShows()
  return <LandingClientShell shows={shows} />
}
