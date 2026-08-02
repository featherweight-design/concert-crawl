import type { ArtistDetailResponse } from '@concert-crawl/types'
import React from 'react'

import { BackChip } from '../back-chip/BackChip'

import { ArtistPlate } from './ArtistPlate'
import { Crumb } from './Crumb'
import { AP_HERO_H, CRAWL_SINCE } from './definitions/constants'
import { ARTIST_COPY } from './definitions/copy'
import { historyLine } from './lib/history-line'
import { PastShows } from './PastShows'
import { UpcomingShows } from './UpcomingShows'

/**
 * ONE responsive component, not two trees. The handoff ships a Mobile and a
 * Desktop file because a prototype canvas can't do media queries; parity is
 * non-negotiable here, so the breakpoints live in `.ap-*` CSS instead.
 *
 * ORDER IS STATE-DEPENDENT, deliberately:
 *   has shows → name · history · shows · previously
 *   no shows  → the empty upcoming block stays the first thing after the
 *               history line, because it is the strongest conversion moment
 *               on the page and must never be pushed below anything.
 *
 * The player, the follow control and the empty-upcoming block are PR-F; the
 * order rule is expressed once here so PR-F slots into it rather than
 * re-deriving it.
 */
export const ArtistPageContent = ({ data }: { data: ArtistDetailResponse }) => {
  const { artist, shows, past, history } = data
  const hasShows = shows.length > 0

  const body = (
    <>
      {hasShows ? <UpcomingShows name={artist.name} shows={shows} /> : null}
      {/* The wrapper carries the top margin, so it has to disappear with its
          contents — an empty `.ap-block-past` leaves a gap under the last row. */}
      {past.length > 0 ? (
        <div className="ap-block-past">
          <PastShows name={artist.name} past={past} />
        </div>
      ) : null}
    </>
  )

  return (
    <main className="ap-page" aria-label={ARTIST_COPY.pageAria(artist.name)}>
      {/* Mobile: full-bleed plate with the back chip over it. */}
      <div className="ap-hero-wrap relative md:hidden">
        <ArtistPlate
          name={artist.name}
          photo={artist.photoUrl}
          height={AP_HERO_H.wide}
          className="ap-hero"
        />
        <BackChip top={56} fallbackHref="/events" />
      </div>

      <div className="ap-shell">
        {/* Desktop: breadcrumb + a sticky left rail. No sub-header — the rail
            keeps wayfinding (and, in PR-F, the follow control) on screen for
            the whole scroll. */}
        <div className="hidden md:block">
          <Crumb name={artist.name} />
        </div>
        <div className="ap-grid">
          <div className="ap-rail hidden md:block">
            <div style={{ borderRadius: 14, overflow: 'hidden' }}>
              <ArtistPlate
                name={artist.name}
                photo={artist.photoUrl}
                height={320}
              />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="ap-name">{artist.name}</h1>
            <p className="ap-history">{historyLine(history, CRAWL_SINCE)}</p>
            <div className="ap-block-shows">{body}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
