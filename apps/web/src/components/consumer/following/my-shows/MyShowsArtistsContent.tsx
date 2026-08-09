'use client'

// My shows ▸ Artists — the third sub-tab (native following, PR 6).
//
// Mobile is a full-bleed list; desktop is a 940px column with a three-up card
// grid and the two actions promoted into the group-heading row. Both ship in
// this component, and the list body is the only part that forks — everything
// above it (tabs, headings, footnote, empty state) is shared, so the two can
// only diverge in box, never in what they say.
//
// Every row here is an existing follow, so nothing on this surface is `locked`:
// DELETE /v1/artists/:slug/follow is deliberately ungated so a downgraded user
// can still leave. A re-follow that the plan does not cover comes back as a
// 403 and routes to the tier picker from there.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { FollowedArtist, PickerEntry } from '@concert-crawl/types'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { TierPickerSheet } from '@/components/consumer/tier-picker/TierPickerSheet'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { SpotifyLogo } from '@/components/brand/spotify-logo/SpotifyLogo'
import { MyShowsTabs } from '@/components/consumer/history/MyShowsTabs'
import { SHELF_NARROW_QUERY } from '@/components/consumer/following/definitions/constants'
import { ArtistManageRow } from './ArtistManageRow'
import { AlertsRow } from './AlertsRow'
import { ArtistsEmpty } from './ArtistsEmpty'
import { FindArtistsRow } from './FindArtistsRow'
import { Mono } from './Mono'
import { GlyphBell, GlyphSearch } from './Glyphs'
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy'
import { ALERTS_HREF, FIND_ARTISTS_HREF } from './definitions/constants'
import { groupFollows, spotifyFollowCount } from './lib/group-follows'

const COPY = MY_SHOWS_ARTISTS_COPY

interface MyShowsArtistsContentProps {
  /**
   * `undefined` means the fetch failed, which is NOT the same as zero. Showing
   * "nobody on your list" to someone who follows fifty artists is the one
   * mistake this surface must never make.
   */
  artists: FollowedArtist[] | undefined
  scaRegion: boolean
}

export const MyShowsArtistsContent = ({
  artists,
  scaRegion,
}: MyShowsArtistsContentProps) => {
  const { surface } = useEntitlement('following')
  const { data: planState } = usePlanState()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(SHELF_NARROW_QUERY)
    const apply = () => setNarrow(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  const follows = useMemo(() => artists ?? [], [artists])
  const groups = useMemo(() => groupFollows(follows), [follows])
  const spotifyCount = useMemo(() => spotifyFollowCount(follows), [follows])

  const pickerEntry: PickerEntry =
    surface === 'tier-picker-on-tap' ? 'logged-out-follow' : 'paywall'

  // Fails OPEN while the plan is resolving: the empty state's CTAs write
  // nothing either way, and showing a paying subscriber an upgrade-shaped
  // pitch is the worse of the two wrong answers.
  const locked = surface !== null && surface !== 'visible-active'

  const onEntitlementRequired = () => setPickerOpen(true)

  const picker = (
    <TierPickerSheet
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      // The picker needs a full PlanState and `usePlanState` is null until it
      // resolves; the logged-out shape is what every other caller falls back to.
      planState={planState ?? LOGGED_OUT_PLAN_STATE}
      scaRegion={scaRegion}
      entry={pickerEntry}
    />
  )

  // The fetch failed. Deliberately NOT the empty state: "nobody on your list"
  // is a claim about the account, and we are not in a position to make it.
  if (artists === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-[940px] flex-1 flex-col px-4 pb-20 pt-4 sm:px-[30px] sm:pb-10 sm:pt-7">
        <MyShowsTabs active="artists" />
        <p
          className="text-fg-muted"
          style={{ fontSize: 13.5, lineHeight: 1.5, marginTop: 24 }}
        >
          {COPY.error}
        </p>
      </main>
    )
  }

  if (follows.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-[940px] flex-1 flex-col px-4 pb-20 pt-4 sm:px-[30px] sm:pb-10 sm:pt-7">
        <MyShowsTabs active="artists" />
        <div className="flex flex-1 flex-col sm:hidden">
          <ArtistsEmpty locked={locked} />
        </div>
        <div className="hidden flex-1 flex-col sm:flex">
          <ArtistsEmpty locked={locked} desktop />
        </div>
        {picker}
      </main>
    )
  }

  const datedHeading = COPY.groups.dated(groups.dated.length)
  const undatedHeading = COPY.groups.undated(groups.undated.length)

  // Desktop promotes these into whichever group heading renders first. They
  // used to live only in the dated row, which stranded them for anyone whose
  // follows all lack a date — the one state where "find artists" matters most.
  const desktopActions = (
    <div className="flex gap-[9px]">
      <Link
        href={ALERTS_HREF}
        className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={denseGhost}
      >
        <GlyphBell size={13} />
        {COPY.alerts.short}
      </Link>
      <Link
        href={FIND_ARTISTS_HREF}
        className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        style={densePrimary}
      >
        <GlyphSearch size={13} />
        {COPY.find.title}
      </Link>
    </div>
  )

  const spotifyNote = spotifyCount > 0 && (
    <div
      style={{
        margin: '12px 16px 0',
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <SpotifyLogo size={14} />
      <p
        style={{
          margin: 0,
          flex: 1,
          fontSize: 12,
          color: 'var(--fg-muted)',
          lineHeight: 1.4,
        }}
      >
        {COPY.spotifyFootnote(spotifyCount)}
      </p>
    </div>
  )

  return (
    // One landmark, two densities. The responsive wrappers are plain divs
    // because a page gets a single <main>, and landmark navigation still walks
    // a CSS-hidden one.
    <main className="flex w-full flex-1 flex-col">
      {/* Mobile: full-bleed list. */}
      <div className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-20 pt-4 sm:hidden">
        <MyShowsTabs active="artists" artistCount={follows.length} />
        <div className="-mx-4">
          {groups.dated.length > 0 && (
            <>
              <div style={{ padding: '13px 16px 9px' }}>
                <Mono as="h2" size={9.5}>
                  {datedHeading}
                </Mono>
              </div>
              {groups.dated.map((artist) => (
                <ArtistManageRow
                  key={artist.canonicalName}
                  artist={artist}
                  narrow={narrow}
                  onEntitlementRequired={onEntitlementRequired}
                />
              ))}
            </>
          )}
          {groups.undated.length > 0 && (
            <>
              <div style={{ padding: '22px 16px 9px' }}>
                <Mono as="h2" size={9.5}>
                  {undatedHeading}
                </Mono>
              </div>
              {groups.undated.map((artist) => (
                <ArtistManageRow
                  key={artist.canonicalName}
                  artist={artist}
                  narrow={narrow}
                  onEntitlementRequired={onEntitlementRequired}
                />
              ))}
            </>
          )}
          <div style={{ marginTop: 18 }}>
            <FindArtistsRow narrow={narrow} />
          </div>
          <AlertsRow />
          {spotifyNote}
        </div>
        {picker}
      </div>

      {/* Desktop: 940px column, three-up cards, actions in the heading row. */}
      <div className="mx-auto hidden w-full max-w-[940px] flex-1 px-[30px] pb-10 pt-7 sm:block">
        <h1
          style={{
            margin: '0 0 18px',
            fontSize: 30,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            color: 'var(--fg)',
          }}
        >
          {COPY.pageTitle}
        </h1>
        <MyShowsTabs active="artists" artistCount={follows.length} />

        {groups.dated.length > 0 && (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <Mono as="h2" size={10}>
                {datedHeading}
              </Mono>
              {desktopActions}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {groups.dated.map((artist) => (
                <ArtistManageRow
                  key={artist.canonicalName}
                  artist={artist}
                  variant="card"
                  onEntitlementRequired={onEntitlementRequired}
                />
              ))}
            </div>
          </>
        )}

        {groups.undated.length > 0 && (
          <>
            <div
              className="flex items-center justify-between gap-3"
              style={{ margin: '26px 0 12px' }}
            >
              <Mono as="h2" size={10}>
                {undatedHeading}
              </Mono>
              {groups.dated.length === 0 && desktopActions}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {groups.undated.map((artist) => (
                <ArtistManageRow
                  key={artist.canonicalName}
                  artist={artist}
                  variant="card"
                  onEntitlementRequired={onEntitlementRequired}
                />
              ))}
            </div>
          </>
        )}

        {spotifyNote}
      </div>
    </main>
  )
}

const denseButton = {
  minHeight: 40,
  padding: '10px 14px',
  borderRadius: 10,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 13,
  letterSpacing: '-0.01em',
  textDecoration: 'none',
} as const

const denseGhost = {
  ...denseButton,
  background: 'transparent',
  color: 'var(--fg)',
  border: '1px solid var(--border-strong)',
  fontWeight: 700,
}

const densePrimary = {
  ...denseButton,
  background: 'var(--signal)',
  color: 'var(--fg-on-accent)',
  border: '1px solid var(--signal)',
  fontWeight: 800,
}
