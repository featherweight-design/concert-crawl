'use client'

// One artist card in the browse follow shelf (nf-cold-start.jsx ShelfCard).
// Square art, a follow badge floated on it, the name, and the next Denver date.
//
// The badge is the SAME affordance as the artist page's FollowButton — an
// artist is followed, a show is watched, and there is no third gesture — drawn
// at badge scale because it sits on artwork rather than in a bar. Its three
// states are idle / following / locked; there is no pending skin, for the same
// reason the big button has none.

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt'
import { useArtistFollow } from '@/components/consumer/artist-page/lib/use-artist-follow'
import { FOLLOWING_COPY } from './definitions/copy'
import type { ShelfArtist } from './definitions/types'

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

/** Press photo with a render-time error gate — signed URLs expire. */
const CardArt = ({
  name,
  photoUrl,
}: {
  name: string
  photoUrl: string | null
}) => {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [photoUrl])

  if (photoUrl !== null && !failed) {
    return (
      <img
        src={photoUrl}
        alt=""
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    )
  }
  // An artist portrait, never a borrowed event graphic: artists draw from the
  // mesh/stripes/concentric/halftone pool, and blueprint stays venue-only.
  return (
    <IdentityArt
      name={name}
      kind="artist"
      scale="tile"
      showInitials={false}
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}

interface ShelfCardProps {
  artist: ShelfArtist
  width: number
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

  return (
    <li
      className="flex shrink-0 flex-col gap-[7px]"
      style={{ width, listStyle: 'none' }}
    >
      <div
        className="relative overflow-hidden"
        style={{ width, height: width, borderRadius: 10 }}
      >
        <CardArt name={artist.name} photoUrl={artist.photoUrl} />
        {artist.slug !== null && (
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
      </div>

      {artist.slug !== null ? (
        <Link
          href={`/artists/${artist.slug}`}
          className="overflow-hidden text-ellipsis whitespace-nowrap font-extrabold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          style={{ fontSize: 12.5, letterSpacing: '-0.01em' }}
        >
          {artist.name}
        </Link>
      ) : (
        <span
          className="overflow-hidden text-ellipsis whitespace-nowrap font-extrabold text-fg"
          style={{ fontSize: 12.5, letterSpacing: '-0.01em' }}
        >
          {artist.name}
        </span>
      )}

      <span
        className="overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.06em',
          marginTop: -3,
          color: on ? 'var(--signal)' : 'var(--fg-subtle)',
        }}
      >
        {artist.dateLine ?? FOLLOWING_COPY.cardNoDate}
      </span>
    </li>
  )
}
