// Shared skeleton visuals for the DiscoveryShelf loading state
// (design_handoff_discovery_loading). Deliberately free of hooks and
// 'use client' so BOTH consumers can render them:
//   - DiscoveryLoadingShelf (client) — adds the 8s timeout/retry behavior
//   - events/loading.tsx (server)    — route fallback, reserves the shelf
//                                      footprint so the shelf doesn't shove
//                                      the page down when it paints
// Box model mirrors TastePickCard VERBATIM (168 · 14 · surface-1 · border ·
// image 116 · body pad 10/11/12 · gap 7) so real picks land with zero shift.

import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { SweepOverlay } from '@/components/ui/skeleton/SweepOverlay'
import { SPOTIFY_COPY } from './definitions/copy'

const COPY = SPOTIFY_COPY.discovery
const LOADING = COPY.loading

// Design handoff DL_MOTION (sole source of truth for motion timings).
const DOT_ANIM = 'dlDot 1400ms ease-in-out infinite'

// Placeholder bar. `tint="price"` paints a faint --signal wash so the price
// row still reads as "price" through the skeleton.
const SkeletonBar = ({
  width,
  height,
  radius = 5,
  tint,
}: {
  width: number | string
  height: number
  radius?: number
  tint?: 'price'
}) => (
  <div
    aria-hidden
    style={{
      width,
      height,
      borderRadius: radius,
      flexShrink: 0,
      background:
        tint === 'price'
          ? 'color-mix(in oklch, var(--signal) 18%, var(--surface-2))'
          : 'var(--surface-2)',
    }}
  />
)

// One skeleton pick card — box-identical to TastePickCard.
const SkeletonCard = ({ className = '' }: { className?: string }) => (
  <li
    className={`relative flex w-[168px] shrink-0 flex-col overflow-hidden rounded-[14px] ${className}`}
    style={{
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
    }}
  >
    <div style={{ height: 116, background: 'var(--surface-2)' }} />
    <div
      className="flex flex-col"
      style={{ padding: '10px 11px 12px', gap: 7 }}
    >
      <SkeletonBar width={74} height={16} />
      <SkeletonBar width="82%" height={13} />
      <SkeletonBar width="94%" height={9} radius={4} />
      <SkeletonBar width={44} height={11} tint="price" />
    </div>
    <SweepOverlay />
  </li>
)

// aria-hidden on the whole visible header block: the parent section's
// aria-label already announces "Loading picks based on your taste" as the
// SR-only stable message. Keeping the visible eyebrow inside the live
// region would re-announce every change (e.g. the loading→timeout flip).
export const ShelfSkeletonHeader = ({ isTimeout }: { isTimeout: boolean }) => (
  <div aria-hidden className="mb-2.5 flex items-center gap-[9px]">
    <SpotifyLogo size={22} />
    <div className="min-w-0 flex-1">
      <h2
        className="font-extrabold text-fg"
        style={{
          fontSize: '16px',
          letterSpacing: '-0.02em',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {COPY.title}
      </h2>
      <div className="mt-0.5 flex items-center gap-1.5">
        {!isTimeout && (
          <span
            aria-hidden
            className="dl-anim"
            style={{
              width: 5,
              height: 5,
              borderRadius: 5,
              background: 'var(--signal)',
              flexShrink: 0,
              boxShadow: '0 0 5px var(--signal)',
              animation: DOT_ANIM,
            }}
          />
        )}
        <span
          className="font-bold uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.1em',
            color: 'var(--fg-subtle)',
          }}
        >
          {isTimeout ? LOADING.eyebrowTimeout : LOADING.eyebrow}
        </span>
      </div>
    </div>
  </div>
)

// 3 cards mobile / 5 desktop. Both counts are one past the fold on their
// viewport: a skeleton that stops exactly where the screen does reserves a
// footprint the real row overflows, and reads as a complete list rather than
// a scrollable one. Rendering 5 up-front and hiding the extras on mobile
// avoids the SSR-vs-client mismatch a window.matchMedia branch would
// introduce. `overflow-hidden` (not
// overflow-x-auto) keeps the full-bleed -mx-4 row from scrolling — the
// browse page's horizontal-overflow regression (#33) came from exactly this
// row, so it must never be independently scrollable.
export const ShelfSkeletonCards = () => (
  <ul
    aria-hidden
    className="-mx-4 flex list-none gap-[11px] overflow-hidden px-4 pb-1 pt-0.5 sm:mx-0 sm:px-0"
  >
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard />
    <SkeletonCard className="hidden sm:flex" />
    <SkeletonCard className="hidden sm:flex" />
  </ul>
)

// Route-fallback composition (events/loading.tsx). aria-hidden throughout:
// the whole page is a fallback here, so there is no meaningful live region
// to announce — unlike DiscoveryLoadingShelf, which IS a live status region
// swapped in mid-session.
export const DiscoveryShelfSkeleton = () => (
  <section aria-hidden className="mb-5 pt-1.5">
    <ShelfSkeletonHeader isTimeout={false} />
    <ShelfSkeletonCards />
  </section>
)
