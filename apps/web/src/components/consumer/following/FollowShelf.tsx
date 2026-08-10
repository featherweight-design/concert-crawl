'use client'

// The browse shelf slot (native following, PR 4). ONE component, two modes:
//
//   zero     starter shelf — followable artists with upcoming Denver dates,
//            shuffled per session. It recruits; it does not apologise, and it
//            has no dismiss affordance. A shelf you can dismiss on day one is
//            a shelf its whole audience never sees twice.
//   some     the artists you follow who have a date on the books.
//
// There was a third `spotify` mode whose only difference was an eyebrow naming
// the source. Spotify is a SOURCE, not a second information architecture, and
// how a follow got onto the list is not something the shelf owes its owner.
//
// Mode is decided on the SERVER from the SSR follow seed, so the slot never
// renders one shelf and swaps to another after a client fetch lands.

import { useEffect, useMemo, useState } from 'react'
import { SearchLink } from '@/components/consumer/search-palette/SearchLink'
import { useAuth } from '@clerk/nextjs'
import type { PickerEntry } from '@concert-crawl/types'
import { useEntitlement } from '@/lib/queries/use-entitlement'
import { usePlanState } from '@/lib/queries/use-plan-state'
import { TierPickerSheet } from '@/components/consumer/tier-picker/lazy'
import { LOGGED_OUT_PLAN_STATE } from '@/components/consumer/tier-picker/definitions/constants'
import { ShelfCard } from './ShelfCard'
import { FOLLOWING_COPY } from './definitions/copy'
import { SHELF_CARD_WIDTH } from '@/components/consumer/definitions/constants'
import { SHELF_VISIBLE_CARDS } from './definitions/constants'
import type { ShelfArtist, ShelfMode } from './definitions/types'
import { readSessionSeed, shuffleWithSeed } from './lib/shuffle'

const ChevronGlyph = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
    <path
      d="M6 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const ShelfHead = ({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) => (
  <div className="mb-[11px] flex items-end justify-between gap-3">
    <div className="flex min-w-0 flex-col gap-[5px]">
      <span
        className="font-bold uppercase"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
          color: 'var(--signal)',
        }}
      >
        {eyebrow}
      </span>
      <h2
        className="font-extrabold text-fg"
        style={{ fontSize: 15.5, letterSpacing: '-0.02em' }}
      >
        {title}
      </h2>
      {body !== undefined && (
        <p
          className="text-fg-muted"
          style={{ fontSize: 12.5, lineHeight: 1.45, textWrap: 'pretty' }}
        >
          {body}
        </p>
      )}
    </div>
  </div>
)

interface FollowShelfProps {
  mode: ShelfMode
  artists: ShelfArtist[]
  /** Follows the server counted. Drives the `some` eyebrow only. */
  followCount: number
  scaRegion: boolean
}

export const FollowShelf = ({
  mode,
  artists,
  followCount,
  scaRegion,
}: FollowShelfProps) => {
  const { isSignedIn } = useAuth()
  const { surface } = useEntitlement('following')
  const { data: planState } = usePlanState()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [seed, setSeed] = useState<number | null>(null)

  // Read AFTER mount: the server rendered the API's order, and reading storage
  // during render would make the first client pass disagree with the HTML.
  // Only the starter shelf rotates — your own artists are yours, in a stable
  // soonest-first order, and shuffling them would be noise.
  const shuffles = mode === 'zero'
  useEffect(() => {
    if (shuffles) setSeed(readSessionSeed())
  }, [shuffles])

  // The cap is universal and lives here alone: a caller that sliced first would
  // hand the shuffle a pre-truncated list, so the same ten would rotate all
  // session instead of the whole set.
  const visible = useMemo(() => {
    const ordered =
      shuffles && seed !== null ? shuffleWithSeed(artists, seed) : artists
    return ordered.slice(0, SHELF_VISIBLE_CARDS)
  }, [artists, seed, shuffles])

  if (visible.length === 0) return null

  const signedOut = isSignedIn === false
  // Clerk and the entitlement both resolve after mount. Until they do the
  // starter shelf fails CLOSED: a tap that reached `toggle` before Clerk
  // answered would find no token and die on "Not authenticated", which is not
  // an ApiError and so never reaches the 403 → picker handoff.
  //
  // The artist page deliberately fails OPEN in the same window
  // (ArtistPageContent.tsx:96) because a locked skin arriving a beat after
  // paint would draw over an existing follow there. The starter shelf has no
  // followed rows by definition and locked renders the same at-rest skin as
  // idle, so failing closed here costs nothing visible.
  const resolved = isSignedIn !== undefined && surface !== null

  // Scoped to `zero` on purpose. A downgraded viewer still has to be able to
  // unfollow, and DELETE /v1/artists/:slug/follow is deliberately ungated to
  // let them (artist-follows.ts:121) — so locking the badge on `some` would
  // strand them holding follows they cannot release. Only the starter shelf,
  // whose rows are all not-yet-followed, gates on entitlement.
  const locked =
    mode === 'zero' &&
    (!resolved || (!signedOut && surface !== 'visible-active'))

  // Fail-closed cuts both ways: an unresolved tap must not write a follow, and
  // it must not show an entitled viewer a paywall either. `pickerEntry` reads
  // `surface`, so opening the sheet early would also pick the wrong pitch. A
  // 403 comes back through `onEntitlementRequired` instead, which never
  // declines — that answer is the server's and is already settled.
  const pickerEntry: PickerEntry =
    surface === 'tier-picker-on-tap' ? 'logged-out-follow' : 'paywall'

  return (
    <section aria-label={FOLLOWING_COPY.shelfAria} className="mb-5 pt-1.5">
      {mode === 'zero' ? (
        <ShelfHead
          eyebrow={FOLLOWING_COPY.starterEyebrow}
          title={FOLLOWING_COPY.starterTitle}
          body={FOLLOWING_COPY.starterBody}
        />
      ) : (
        <ShelfHead
          eyebrow={FOLLOWING_COPY.yoursEyebrow(followCount)}
          title={FOLLOWING_COPY.yoursTitle}
        />
      )}

      {/* `relative` + `overflow-hidden` on the full-bleed wrapper: the sr-only
          gate sentences inside the cards are position:absolute with no offsets,
          so without a positioned ancestor their rects resolve against <html>
          and leak into the page's scrollWidth at 320px (the #33 mechanism). */}
      <div className="relative -mx-4 max-w-[100vw] overflow-hidden sm:mx-0 sm:max-w-full">
        <ul className="flex list-none gap-[10px] overflow-x-auto px-4 pb-1 pt-0.5 sm:px-0">
          {visible.map((artist) => (
            <ShelfCard
              key={artist.key}
              artist={artist}
              width={SHELF_CARD_WIDTH}
              starter={mode === 'zero'}
              locked={locked}
              signedOut={signedOut}
              onGatedTap={() => {
                if (resolved) setPickerOpen(true)
              }}
              onEntitlementRequired={() => setPickerOpen(true)}
            />
          ))}
        </ul>
      </div>

      {mode === 'zero' && (
        <div className="pt-[13px]">
          {/* There is no /artists index route and this epic does not add one,
              so "browse all artists" means search. */}
          <SearchLink
            className="inline-flex items-center gap-[5px] font-bold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              color: 'var(--signal)',
            }}
          >
            {FOLLOWING_COPY.starterAction}
            <ChevronGlyph />
          </SearchLink>
        </div>
      )}

      <TierPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        planState={planState ?? LOGGED_OUT_PLAN_STATE}
        scaRegion={scaRegion}
        entry={pickerEntry}
      />
    </section>
  )
}
