'use client'

// One followed artist on My shows ▸ Artists.
//
// Two densities of the SAME row, not two components: `row` is the mobile
// full-bleed list item, `card` is the desktop two-up grid cell. They differ
// in box and type scale only — same fields, same order, same control — so a
// change to what a row says lands on both by construction.
//
// The control is the shipped FollowButton. There is no second follow
// affordance in this product and no confirm step on unfollow: the row stays
// where it is until the next navigation, so a mis-tap is one tap to undo.
//
// It runs at `md` (44px) in both densities. NF_FOLLOW_SIZES permits `sm` only
// where the containing row is itself the tap target, which is true of the
// search result row but not here: the name links to the artist page, so
// unfollow has no target but the button. It also keeps its label in both,
// because an unlabelled check reads as confirmation rather than as a toggle
// you can switch off. 320px is the one exception, where `narrow` drops the
// word for want of room. That labelled control is also why the desktop grid is
// two-up rather than the handoff's three-up: it needs the width.

import Link from 'next/link'
import { Panel } from '@/components/consumer/image-slot'
import { FollowDateLine } from '@/components/consumer/following/FollowDateLine'
import { FollowButton } from '@/components/consumer/artist-page/FollowButton'
import { useArtistFollow } from '@/components/consumer/artist-page/lib/use-artist-follow'
import { followDateLine } from '@/lib/following'
import type { FollowedArtist } from '@concert-crawl/types'
import { MY_SHOWS_ARTISTS_COPY } from './definitions/copy'
import {
  CARD_ART_SIZE,
  ROW_ART_SIZE,
  ROW_ART_SIZE_NARROW,
} from './definitions/constants'
import { SourceMark } from './SourceMark'

const COPY = MY_SHOWS_ARTISTS_COPY

export interface ArtistManageRowProps {
  artist: FollowedArtist
  /** `row` is mobile, `card` is the desktop grid cell. */
  variant?: 'row' | 'card'
  /** 320px: the row has no width for the word "Following". */
  narrow?: boolean
  /** The API answered 403 — open the tier picker. */
  onEntitlementRequired: () => void
}

export const ArtistManageRow = ({
  artist,
  variant = 'row',
  narrow = false,
  onEntitlementRequired,
}: ArtistManageRowProps) => {
  // Hooks run unconditionally. A slug-less follow (a Spotify act never billed
  // in Denver) simply never renders the control that would call `toggle` —
  // the follow endpoint is keyed by slug, so there is nothing to call.
  const follow = useArtistFollow(artist.slug ?? '', true, onEntitlementRequired)

  const card = variant === 'card'
  const art = card ? CARD_ART_SIZE : narrow ? ROW_ART_SIZE_NARROW : ROW_ART_SIZE
  const dateLine = followDateLine(artist.nextShow)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        ...(card
          ? {
              padding: 12,
              borderRadius: 12,
              border: '1px solid var(--border)',
              // Group 1 cards are the ones with a date; the tint is what
              // separates them from the reference list below.
              ...(artist.nextShow === null
                ? {}
                : { background: 'var(--surface-1)' }),
            }
          : { padding: '11px 16px', borderTop: '1px solid var(--border)' }),
      }}
    >
      <Panel
        surface="artist"
        name={artist.name}
        photoUrl={artist.photoUrl}
        size={art}
      />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: card ? 0 : 4,
        }}
      >
        {artist.slug === null ? (
          <span
            className="overflow-hidden text-ellipsis whitespace-nowrap"
            style={{
              fontSize: card ? 14 : 14.5,
              fontWeight: 800,
              letterSpacing: '-0.015em',
              color: 'var(--fg)',
            }}
          >
            {artist.name}
          </span>
        ) : (
          <Link
            href={`/artists/${artist.slug}`}
            className="overflow-hidden text-ellipsis whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            style={{
              fontSize: card ? 14 : 14.5,
              fontWeight: 800,
              letterSpacing: '-0.015em',
              color: 'var(--fg)',
              textDecoration: 'none',
            }}
          >
            {artist.name}
          </Link>
        )}

        <FollowDateLine
          dateLine={dateLine}
          fallback={COPY.groups.noDates}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: card ? 9 : 9.5,
            letterSpacing: dateLine === null ? '0.08em' : '0.06em',
            fontWeight: dateLine === null ? 600 : 400,
            marginTop: card ? 4 : 0,
            // The quiet group is not a signal, so it does not get the signal
            // colour — the date line earns that by being actionable.
            color: dateLine === null ? 'var(--fg-subtle)' : 'var(--signal)',
          }}
        />

        {artist.source !== 'manual' && (
          <span style={{ marginTop: card ? 4 : 1 }}>
            <SourceMark />
          </span>
        )}
      </div>

      {artist.slug !== null && (
        <FollowButton
          name={artist.name}
          following={follow.following}
          signedOut={false}
          size="md"
          iconOnly={narrow}
          onToggle={follow.toggle}
          // Unreachable: every row here is an existing follow, and DELETE is
          // ungated, so `locked` is never true. A 403 on a re-follow comes
          // back through `onEntitlementRequired` instead.
          onLockedTap={onEntitlementRequired}
        />
      )}
    </div>
  )
}
