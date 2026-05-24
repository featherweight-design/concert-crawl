'use client'

import React from 'react'
import {
  TierShowtime,
  HistoryShowtime,
  PricesShowtime,
  CalendarShowtime,
  ShareableShowtime,
  WatchersShowtime,
  SpotifyShowtime,
  PassportShowtimeStubs,
} from './heroes/showtime-heroes-p1'
import {
  FollowingShowtime,
  PriceDropShowtime,
  SetlistShowtime,
  FirstTimerShowtime,
  LastTimeShowtime,
  SupportActShowtime,
  VenuePassportShowtime,
} from './heroes/showtime-heroes-p2'
import { SPOTLIGHT_COMPACT_HEROES } from './heroes/showtime-compact'

interface SpotlightHeroProps {
  hero?: string
  compact?: boolean
}

const FULL_HEROES: Record<string, React.ComponentType> = {
  price: PricesShowtime,
  tiers: TierShowtime,
  history: HistoryShowtime,
  calendar: CalendarShowtime,
  share: ShareableShowtime,
  watchers: WatchersShowtime,
  spotify: SpotifyShowtime,
  following: FollowingShowtime,
  'price-drop': PriceDropShowtime,
  setlist: SetlistShowtime,
  'first-timer': FirstTimerShowtime,
  'last-time': LastTimeShowtime,
  'support-act': SupportActShowtime,
  passport: PassportShowtimeStubs,
  'venue-passport': VenuePassportShowtime,
}

export function SpotlightHero({ hero = 'price', compact = false }: SpotlightHeroProps) {
  if (compact) {
    const CompactCmp = SPOTLIGHT_COMPACT_HEROES[hero] ?? SPOTLIGHT_COMPACT_HEROES['passport']
    if (!CompactCmp) return null
    return <CompactCmp />
  }

  const FullCmp = FULL_HEROES[hero]
  if (!FullCmp) return null
  return <FullCmp />
}
