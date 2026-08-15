'use client'

// One artist card in the browse follow shelf.
//
// Box, type scale and row order are the Spotify taste card's (spotify/
// DiscoveryShelf.tsx `TastePickCard`) on purpose: the two shelves occupy ONE
// slot on browse, so a viewer meets them as a single component that sometimes
// says a different thing. Anything changed here is changed there too, or the
// slot starts flickering between two card designs.
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
import { FlexArt } from '@/components/consumer/image-slot'
import { FollowDateLine } from './FollowDateLine'
import { FOLLOWING_COPY } from './definitions/copy'
import type { ShelfArtist } from './definitions/types'

// Only the starter shelf's badge reaches this: it is the acknowledgement of a
// follow the viewer just made, not a label on a list that is followed by
// definition.
const CheckGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
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
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
)

const LockGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
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
      {/* The card's height is definite (SHELF_CARD_HEIGHT on the `<li>`), so
          `flex-1` here resolves against that rather than against content: the
          ART absorbs whatever the show info doesn't take, and a long artist
          name never crops its own dates. The floor is what the art keeps if a
          body ever renders taller than expected. Same trade the Spotify card
          makes.

          `radius={0}` because the card shell already clips with a 14px radius;
          rounding the art too would round the corners that sit against the
          body. PR 7 pins this to a 3:4 `Panel` — until then the shape is
          exactly what it was. */}
      <FlexArt
        surface="artist"
        name={artist.name}
        photoUrl={artist.photoUrl}
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
      {artist.slug !== null ? (
        <Link
          href={`/artists/${artist.slug}`}
          className={shellClass}
          style={shellStyle}
        >
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
              width: 34,
              height: 34,
              borderRadius: 34,
              background: on
                ? 'color-mix(in oklab, var(--signal) 22%, rgba(0,0,0,0.5))'
                : 'rgba(0,0,0,0.5)',
              border: `1.5px solid ${on ? 'var(--signal)' : 'rgba(255,255,255,0.6)'}`,
              color: on ? 'var(--signal)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(6px)',
            }}
          >
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
