'use client'

// One artist card in the browse follow shelf.
//
// Box, type scale and row order are the Spotify taste card's (spotify/
// DiscoveryShelf.tsx `TastePickCard`) on purpose: the two shelves occupy ONE
// slot on browse, so a viewer meets them as a single component that sometimes
// says a different thing. Anything changed here is changed there too, or the
// slot starts flickering between two card designs.
//
// The card opens the SHOW, matching the taste card's `/events/{eventId}`. The
// two sat in one slot linking to two different places, which made the
// destination a coin flip on which shelf you happened to get.
//
// The art is still the ARTIST photo, never the event graphic — a card about a
// person does not borrow a show's poster (imagery rule, #1531).
//
// The follow badge renders only on the starter shelf. On "Your artists" every
// row is followed by definition, so a check floating over each one restated the
// section heading; the badge that survives is the starter shelf's plus/lock,
// which is the only follow affordance that surface has.

import { useId } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/components/consumer/definitions/lib'
import { SHELF_CARD_HEIGHT } from '@/components/consumer/definitions/constants'
import { useArtistFollow } from '@/components/consumer/artist-page/lib/use-artist-follow'
import {
  NF_FOLLOW_SIZES,
  NF_TAP_MIN,
} from '@/components/consumer/artist-page/definitions/constants'
import { Panel } from '@/components/consumer/image-slot'
import { FollowDateLine } from './FollowDateLine'
import { FOLLOWING_COPY } from './definitions/copy'
import type { ShelfArtist } from './definitions/types'

// Only the starter shelf's badge reaches this: it is the acknowledgement of a
// follow the viewer just made, not a label on a list that is followed by
// definition.
//
// All three draw at the size table's `badge` glyph so the on-art control keeps
// step with every other follow affordance in the app.
const GLYPH = NF_FOLLOW_SIZES.badge.glyph

/** How far the invisible target grows past the 26px circle on every side. */
const BADGE_GROW = (NF_TAP_MIN - NF_FOLLOW_SIZES.badge.height) / 2

const CheckGlyph = () => (
  <svg width={GLYPH} height={GLYPH} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M3.2 8.4l3.1 3.1 6.5-6.9"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const PlusGlyph = () => (
  <svg width={GLYPH} height={GLYPH} viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
)

const LockGlyph = () => (
  <svg width={GLYPH} height={GLYPH} viewBox="0 0 12 12" fill="none" aria-hidden>
    <rect
      x="2.2"
      y="5.4"
      width="7.6"
      height="5"
      rx="1.2"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M4 5.4V4a2 2 0 014 0v1.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
)

interface ShelfCardProps {
  artist: ShelfArtist
  width: number
  /**
   * The starter shelf, where nothing is followed yet. It is the only mode that
   * draws a follow badge: on "Your artists" the badge could only ever say
   * "following", which the section heading already said.
   */
  starter: boolean
  /** Signed in, but the plan cannot follow. Never true while already following. */
  locked: boolean
  /** No session at all — the badge hands off rather than writing anything. */
  signedOut: boolean
  /** Locked or signed-out activation. The shelf owns the sheet. */
  onGatedTap: () => void
  /**
   * The API answered 403. Separate from `onGatedTap` because that one can
   * decline to open the sheet while the plan is still resolving, whereas a 403
   * is the server's settled answer and must always be honoured.
   */
  onEntitlementRequired: () => void
}

export const ShelfCard = ({
  artist,
  width,
  starter,
  locked,
  signedOut,
  onGatedTap,
  onEntitlementRequired,
}: ShelfCardProps) => {
  // Hooks run unconditionally; a slug-less row simply never renders the badge
  // that would call `toggle` (the follow endpoint is keyed by slug, so there
  // is nothing to call).
  const follow = useArtistFollow(
    artist.slug ?? '',
    artist.following,
    onEntitlementRequired,
  )
  const gateId = `nf-shelf-gate-${useId().replace(/:/g, '')}`

  const gated = locked || signedOut
  // Signed out or locked we draw the at-rest skin: there is no relationship to
  // render for a viewer who has none.
  const on = !gated && follow.following
  const price = formatPrice(
    artist.price === null ? null : String(artist.price),
    null,
  )

  // The badge is a `<button>`, so it cannot live inside the card's `<a>`. It is
  // a sibling positioned over the art instead.
  const badge = starter && artist.slug !== null

  const body = (
    <>
      {/* 3:4, pinned. This is the only slot in the product that takes that
          ratio (#1525 §2) — the shelf is a portrait card, and unlike the taste
          pick beside it, its art can declare a shape because nothing hotlinked
          sizes it.

          `scale="hero"` because `size="100%"` cannot tell `Panel` how big it
          renders, and 224px is hero territory by the slot metrics' own 112px
          threshold. Left to derive it would fall to `tile` and draw this card
          at tile density: fewer stripes, fewer rings, a coarser halftone than a
          224px box wants.

          `radius={0}` because the card shell already clips with a 14px radius;
          rounding the art too would round the corners that sit against the
          body. */}
      <Panel
        surface="artist"
        name={artist.name}
        photoUrl={artist.photoUrl}
        size="100%"
        ratio="3 / 4"
        scale="hero"
        radius={0}
      />
      <span
        className="flex shrink-0 flex-col gap-[7px]"
        style={{ padding: '10px 11px 12px' }}
      >
        <span
          className="overflow-hidden text-ellipsis whitespace-nowrap font-extrabold leading-[1.15] text-fg"
          style={{
            fontSize: '14.5px',
            letterSpacing: '-0.015em',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {artist.name}
        </span>
        <FollowDateLine
          dateLine={artist.dateLine}
          fallback={FOLLOWING_COPY.cardNoDate}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.02em',
            color: 'var(--fg-muted)',
          }}
        />
        <span
          className="font-semibold"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: price !== null ? 'var(--signal)' : 'var(--fg-subtle)',
          }}
        >
          {price ?? FOLLOWING_COPY.cardPriceTba}
        </span>
      </span>
    </>
  )

  // The show wins over the profile: the card is showing a date and a price, so
  // the thing behind it is the night, not the act's page. The artist page is
  // the fallback for a follow with nothing on the books, and a row with
  // neither is inert rather than linked somewhere arbitrary.
  const href =
    artist.eventId !== null
      ? `/events/${artist.eventId}`
      : artist.slug !== null
        ? `/artists/${artist.slug}`
        : null

  const shellClass =
    'flex w-full flex-col overflow-hidden rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal'
  const shellStyle = {
    background: 'var(--surface-1)',
    border: '1px solid var(--border)',
  }

  return (
    <li
      className="relative flex shrink-0"
      style={{ width, height: SHELF_CARD_HEIGHT, listStyle: 'none' }}
      data-testid="shelf-card"
    >
      {href !== null ? (
        <Link href={href} className={shellClass} style={shellStyle}>
          {body}
        </Link>
      ) : (
        <span className={shellClass} style={shellStyle}>
          {body}
        </span>
      )}

      {badge && (
        <>
          <button
            type="button"
            onClick={() => {
              if (gated) {
                onGatedTap()
                return
              }
              follow.toggle()
            }}
            // Locked has no pressed state to report — it is not a toggle.
            aria-pressed={gated ? undefined : on}
            aria-label={
              on
                ? FOLLOWING_COPY.followingAria(artist.name)
                : FOLLOWING_COPY.followAria(artist.name)
            }
            {...(gated && { 'aria-describedby': gateId })}
            className="absolute flex cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            style={{
              top: 7,
              right: 7,
              width: NF_FOLLOW_SIZES.badge.height,
              height: NF_FOLLOW_SIZES.badge.height,
              borderRadius: NF_FOLLOW_SIZES.badge.radius,
              // The on-art skin stays its own thing: `FollowButton`'s quiet
              // outline is drawn to read against `--bg`, and over a photo it
              // disappears. A darkened scrim and a light border are what make a
              // control legible on artwork, so the shelf takes the size table's
              // geometry and keeps its own colours.
              background: on
                ? 'color-mix(in oklab, var(--signal) 22%, rgba(0,0,0,0.5))'
                : 'rgba(0,0,0,0.5)',
              border: `1.5px solid ${on ? 'var(--signal)' : 'rgba(255,255,255,0.6)'}`,
              color: on ? 'var(--signal)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {/* Same bargain `FollowButton` strikes: the circle draws at 26 and
                the target stays 44 (WCAG 2.5.8). The overlay reaches past the
                card's edge on the right, which is where the card's own padding
                is, so nothing interactive sits under it. */}
            <span
              aria-hidden
              data-hit-overlay=""
              style={{ position: 'absolute', inset: -BADGE_GROW }}
            />
            {on ? <CheckGlyph /> : gated ? <LockGlyph /> : <PlusGlyph />}
          </button>
          {gated && (
            <span id={gateId} className="sr-only">
              {FOLLOWING_COPY.followGate}
            </span>
          )}
        </>
      )}
    </li>
  )
}
