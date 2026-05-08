import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import LandingClientShell from './_components/LandingClientShell'
import type { Show } from '@/components/brand/gig-poster/GigPoster'

const HERO_SHOWS: Show[] = [
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

export default async function LandingPage() {
  const { userId } = await auth()
  if (userId) redirect('/events')

  return <LandingClientShell shows={HERO_SHOWS} />
}
