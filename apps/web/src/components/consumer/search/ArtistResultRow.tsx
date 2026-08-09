'use client'

// One artist row in the search results (native following, PR 5). The row is
// two targets, not one: the name half opens the artist's page, the follow half
// is the shared `FollowButton`. Search is where "you must be on their page to
// follow them" gets fixed, so the button has to be here rather than one tap in.
//
// An artist with nothing upcoming keeps a normal LIVE Follow button and says so
// in the muted meta line. That is the clearest case the feature exists for, and
// there is no `unavailable` state to render instead: artists are a projection
// off event billing strings, so an artist with no Denver history cannot be in
// the index at all.

import type { ArtistSearchResult } from '@concert-crawl/types'
import type { EntitlementCell } from '@concert-crawl/entitlements'
import { FollowButton } from '@/components/consumer/artist-page/FollowButton'
import { useArtistFollow } from '@/components/consumer/artist-page/lib/use-artist-follow'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { EventImage } from '../event-image'

const copy = CONSUMER_COPY.search

interface ArtistResultRowProps {
  artist: ArtistSearchResult
  selected: boolean
  onHover?: () => void
  onNavigate: () => void
  /** Clerk's answer, `undefined` while it is still resolving. */
  isSignedIn: boolean | undefined
  /** The `following` entitlement surface. `null` while the plan resolves. */
  surface: EntitlementCell | null
  /** A locked tap. The section owns the sheet, so one sheet serves every row. */
  onLockedTap: () => void
  /** The server's settled 403, which is honoured whatever the client believed. */
  onEntitlementRequired: () => void
  size: 'sm' | 'md'
  iconOnly: boolean
}

export const ArtistResultRow = ({
  artist,
  selected,
  onHover,
  onNavigate,
  isSignedIn,
  surface,
  onLockedTap,
  onEntitlementRequired,
  size,
  iconOnly,
}: ArtistResultRowProps) => {
  const follow = useArtistFollow(
    artist.slug,
    artist.following,
    onEntitlementRequired,
  )

  // This surface fails OPEN while Clerk and the entitlement resolve, matching
  // the artist page (ArtistPageContent.tsx) rather than the browse starter
  // shelf (FollowShelf.tsx), and for the shelf's own stated reason read the
  // other way round. The shelf fails closed because its rows are never already
  // followed and `locked` draws the same at-rest skin as `idle`, so closing
  // costs nothing visible. Neither holds here:
  //
  //   1. These rows CAN be already followed (PR 3 puts `following` on the
  //      result), and a locked skin arriving a beat after paint would draw
  //      over an existing follow across a whole list.
  //   2. A row cannot paint before Clerk has answered anyway: `useSearch`
  //      awaits `getToken()` before it fetches, so by the time there are
  //      results to render the token round-trip is already done.
  //
  // The window fail-open would otherwise leave — a tap with no token throws a
  // plain `Error('Not authenticated')`, which is not an `ApiError` and so never
  // reaches the 403 → picker handoff — is closed by treating an unresolved
  // session as signed out below. `signedOut` renders idle's exact pixels
  // (#794 §3.10) and hands a tap to the picker instead of a dead request.
  //
  // `artist.following` is proof of a session on its own: the search route
  // reports `false` for every anonymous request, so a `true` here can only have
  // come from an authenticated one. That is what keeps an already-followed row
  // live through the same window instead of flashing back to "Follow".
  const signedOut = isSignedIn !== true && !artist.following

  // `&& !follow.following` is the downgrade case, and it is load-bearing:
  // DELETE is deliberately unentitled so a downgraded user can always undo a
  // follow, and locking a followed row would strand them holding it.
  // `surface === null` (still resolving) is deliberately NOT locked.
  const locked =
    !signedOut &&
    surface !== null &&
    surface !== 'visible-active' &&
    !follow.following

  const meta =
    artist.upcomingShowCount > 0
      ? `${artist.upcomingShowCount} ${
          artist.upcomingShowCount === 1
            ? copy.upcomingShowSingular
            : copy.upcomingShowPlural
        }`
      : copy.artistPageNoUpcoming

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        boxSizing: 'border-box',
        background: selected ? 'var(--surface-2)' : 'transparent',
      }}
      onMouseEnter={onHover}
    >
      <button
        onClick={onNavigate}
        data-selected={selected ? 'true' : undefined}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flex: 1,
          minWidth: 0,
          // The row is the ≥44px target that lets the button run at 36.
          minHeight: 44,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            overflow: 'hidden',
            background: 'var(--surface-2)',
            border: '1px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--fg-muted)',
            flexShrink: 0,
          }}
        >
          {/* An artist surface: the portrait or IdentityArt, never an event's
              artwork. Decorative, because the row already renders the name as
              text, and an empty alt also leaves IdentityArt without a role, so
              neither branch announces the name twice. */}
          <EventImage
            src={artist.photoUrl}
            alt=""
            artist={artist.name}
            identityScale="micro"
            className="h-full w-full"
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--fg)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {artist.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              // The no-dates line is quieter than a real count, not louder: it
              // is an absence, and the live button beside it is the point.
              color:
                artist.upcomingShowCount > 0
                  ? 'var(--fg-muted)'
                  : 'var(--fg-subtle)',
            }}
          >
            {meta}
          </div>
        </div>
      </button>
      {/* The tag that told a reader which kind of "Artists" row this is. Kept
          from #1115, dropped only in the narrowest breakpoint, where the follow
          control is already icon-only and there is no width left to spend on a
          label the section header above also carries. */}
      {!iconOnly && (
        <span
          style={{
            flexShrink: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            border: '1px solid var(--border-strong)',
            borderRadius: 4,
            padding: '2px 6px',
          }}
        >
          {copy.artistPageRowTag}
        </span>
      )}
      <FollowButton
        name={artist.name}
        following={follow.following}
        signedOut={signedOut}
        locked={locked}
        size={size}
        iconOnly={iconOnly}
        onToggle={follow.toggle}
        onLockedTap={onLockedTap}
      />
    </div>
  )
}
