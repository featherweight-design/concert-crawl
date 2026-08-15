'use client'

import { nfLocked } from '@concert-crawl/entitlements'
import type { ArtistDetailResponse } from '@concert-crawl/types'
import React, { useCallback, useState } from 'react'

import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { useTheme } from '@/theme'

import { BackChip } from '../back-chip/BackChip'

import { ArtistPlate } from './ArtistPlate'
import { Crumb } from './Crumb'
import {
  AP_HERO_H,
  AP_STICKY_AFTER,
  CRAWL_SINCE,
} from './definitions/constants'
import { ARTIST_COPY } from './definitions/copy'
import { ArtistEmbed } from './embed/ArtistEmbed'
import { EmptyUpcoming } from './EmptyUpcoming'
import { FollowBlock } from './FollowBlock'
import { historyLine } from './lib/history-line'
import { useArtistFollow } from './lib/use-artist-follow'
import { useIsDesktop, useScrolledPast } from './lib/use-viewport'
import { PastShows } from './PastShows'
import { StickyBar } from './StickyBar'
import { UpcomingShows } from './UpcomingShows'

/**
 * ONE responsive component, not two trees. The handoff ships a Mobile and a
 * Desktop file because a prototype canvas can't do media queries; parity is
 * non-negotiable here, so the breakpoints live in `.ap-*` CSS instead.
 *
 * ORDER IS STATE-DEPENDENT, deliberately:
 *   has shows → name · history · follow · player · shows · previously
 *   no shows  → the empty upcoming block stays the first thing after the
 *               history line, because it is the strongest conversion moment
 *               on the page and must never be pushed below anything. The
 *               player falls to last, which is also why it ships no skip link
 *               in that state — there is nothing below to skip to.
 *
 * EXACTLY ONE LIVE FOLLOW AFFORDANCE, always, enforced here in code rather
 * than by convention. `hidden md:block` would hide pixels while still mounting
 * a second button in the accessibility tree, so the viewport decision is made
 * in JS (`useIsDesktop`) and only one slot is ever rendered:
 *   desktop            → the sticky left rail owns it for the whole scroll
 *   mobile, has shows  → the inline block until the page scrolls past the
 *                        hero, then the sticky sub-header takes over
 *   mobile, no shows   → the empty-upcoming block owns it, and the sub-header
 *                        is told not to grow one (`showFollow={false}`)
 */
export const ArtistPageContent = ({
  data,
  scaRegion = false,
}: {
  data: ArtistDetailResponse
  scaRegion?: boolean
}) => {
  const { artist, shows, past, history } = data
  const hasShows = shows.length > 0

  // `null` is the API's word for "nobody is signed in" — distinct from `false`,
  // which is a real signed-in user who does not follow this artist.
  const signedOut = data.following === null
  const { data: planState } = usePlanState()
  const [pickerOpen, setPickerOpen] = useState(false)
  const openUpgrade = useCallback(() => setPickerOpen(true), [])
  const { following, toggle } = useArtistFollow(
    artist.slug,
    data.following ?? false,
    openUpgrade,
  )

  const isDesktop = useIsDesktop()
  const scrolled = useScrolledPast(AP_STICKY_AFTER)
  const { theme } = useTheme()

  // ONE gate, asked once, passed down. `nfLocked` takes the plan state rather
  // than a tier string because `roleComped` is an override the matrix does not
  // encode — never test `plan === 'free'` here.
  //
  // Undefined while the plan is still resolving, and `false` is the right
  // answer for that window: a locked skin that appears a beat after paint is a
  // worse lie than a live button whose 403 opens the same picker (which is what
  // `openUpgrade` already handles).
  //
  // `&& !following` is the downgrade case, and it is load-bearing. Eng spec
  // §3.2 settles it: downgrading never deletes follows, and DELETE is
  // unentitled by design so the user can always undo one. Gating on the plan
  // alone would draw the locked skin over an existing follow and strand it —
  // the artist page is the surface most people would reach for to remove it.
  // Once the follow is gone the control locks again, which is correct.
  const locked =
    !signedOut && planState !== undefined && nfLocked(planState) && !following

  const followProps = {
    name: artist.name,
    following,
    signedOut,
    locked,
    onToggle: toggle,
    onLockedTap: openUpgrade,
  }

  // Mobile hands the follow control to the sub-header the moment the bar
  // arrives; desktop never renders the bar, so its rail keeps it throughout.
  const inlineFollow = hasShows && !isDesktop && !scrolled

  const player = (
    <ArtistEmbed
      name={artist.name}
      spotifyArtistId={artist.spotifyArtistId}
      // With no shows the player is the last block on the page, so there is
      // nothing to skip forward to.
      skipTo={hasShows ? 'upcoming' : null}
      themeKey={theme}
    />
  )

  return (
    <main className="ap-page" aria-label={ARTIST_COPY.pageAria(artist.name)}>
      <StickyBar
        {...followProps}
        visible={!isDesktop && scrolled}
        showFollow={hasShows}
      />

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
            keeps wayfinding and the follow control on screen for the whole
            scroll. */}
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
            {isDesktop ? (
              <div style={{ marginTop: 16 }}>
                <FollowBlock {...followProps} />
              </div>
            ) : null}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="ap-name">{artist.name}</h1>
            <p className="ap-history">{historyLine(history, CRAWL_SINCE)}</p>

            {inlineFollow ? (
              <div className="ap-block-follow">
                <FollowBlock {...followProps} />
              </div>
            ) : null}

            {hasShows ? (
              <>
                <div className="ap-block-player">{player}</div>
                <div className="ap-block-shows">
                  <UpcomingShows name={artist.name} shows={shows} />
                </div>
              </>
            ) : (
              <div className="ap-block-shows">
                <EmptyUpcoming {...followProps} inlineFollow={!isDesktop} />
              </div>
            )}

            {/* The wrapper carries the top margin, so it has to disappear with
                its contents — an empty `.ap-block-past` leaves a gap under the
                last row. */}
            {past.length > 0 ? (
              <div className="ap-block-past">
                <PastShows name={artist.name} past={past} />
              </div>
            ) : null}

            {hasShows ? null : <div className="ap-block-player">{player}</div>}
          </div>
        </div>
      </div>

      {/* Following is Premium. This one sheet serves both routes into the
          upgrade: a locked tap (which never issues a request) and the 403 a
          request gets when the plan resolved late or lapsed mid-session. */}
      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry="paywall"
      />
    </main>
  )
}
