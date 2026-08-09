'use client'

import { useAuth } from '@clerk/nextjs'
import { WatchShowButton } from '@/components/consumer/watch-show-button/WatchShowButton'
import {
  FollowNudgeCard,
  useFirstWatchNudge,
} from '@/components/consumer/following/nudge'
import { useEventWatchers } from '@/lib/queries/use-event-watchers'
import { useWatching } from '@/lib/queries/use-watching'
import { showWatcherCrawl } from '@/lib/watchers'
import { WatchersSurface } from './WatchersSurface'

interface WatchZoneProps {
  eventId: string
  initialWatching?: boolean
  /** Headliner name, forwarded to the button's signed-out accessible name. */
  artist?: string | undefined
  /** Server-resolved, forwarded to the nudge's tier picker. */
  scaRegion: boolean
}

/**
 * The event-detail Watch strip: one bordered object holding two sibling rows.
 *
 * Row 1 is the toggle — the eye and a status line that carries copy in both
 * states, so tapping never changes the strip's height. Row 2 is the crawl, and
 * it only appears once two people can be named (see `showWatcherCrawl`).
 *
 * The rows are siblings and never nested: the crawl holds its own controls, and
 * a button inside the toggle's hit area would be unreachable by pointer.
 *
 * The status line is rendered by the button's `strip` variant rather than by
 * every WatchShowButton, because the button also sits on each EventCard and
 * HeroEventCard, where a line of copy under every card in the browse grid would
 * be noise.
 *
 * ⚠️ The first-watch follow nudge REPLACES this strip in place (native
 * following, PR 10), at every width — not a ported card and not a modal. It
 * carries the strip's own on-state sentence for exactly that reason: the slot
 * still owes the confirmation the strip would have given. Answering the nudge
 * restores the strip.
 */
export const WatchZone = ({
  eventId,
  initialWatching = false,
  artist,
  scaRegion,
}: WatchZoneProps) => {
  const { isSignedIn } = useAuth()
  // Scoped to this show: a watch started elsewhere in the session belongs to
  // the floating gate, and the two are mutually exclusive by route.
  const nudge = useFirstWatchNudge(eventId)
  const { data: watchedShows } = useWatching()
  const { data: watchers, isPending } = useEventWatchers(eventId)

  // Mirrors WatchShowButton's derivation so the strip's chrome flips with the
  // button rather than lagging a render behind — same hook, same cache entry,
  // no extra request and no lifted state.
  const cacheIsReady = watchedShows !== undefined
  const isWatching = cacheIsReady
    ? watchedShows.some((show) => show.eventId === eventId)
    : initialWatching
  // Signed out nothing is watched, however stale the cache is.
  const renderedWatching = !!isSignedIn && isWatching

  const loading = isPending && !!isSignedIn
  const showCrawl = !loading && showWatcherCrawl(watchers, renderedWatching)

  if (nudge.target !== null) {
    return (
      <FollowNudgeCard
        target={nudge.target}
        variant="inline"
        scaRegion={scaRegion}
        onAnswer={nudge.answer}
      />
    )
  }

  return (
    <div
      data-testid="watch-strip"
      // The row-1 button fills this box edge to edge, so its own focus ring
      // would land under the rounded `overflow-hidden` clip. The ring is drawn
      // on the container instead, where nothing crops it.
      className="flex flex-col overflow-hidden rounded-[10px] border-[1.5px] transition-colors focus-within:ring-2 focus-within:ring-[var(--signal)] focus-within:ring-offset-1"
      style={{
        borderColor: renderedWatching
          ? 'color-mix(in oklab, var(--accent) 50%, transparent)'
          : 'var(--border)',
        background: renderedWatching
          ? 'color-mix(in oklab, var(--accent) 10%, transparent)'
          : 'var(--surface-2)',
      }}
    >
      <WatchShowButton
        eventId={eventId}
        initialWatching={initialWatching}
        artist={artist}
        variant="strip"
      />
      {showCrawl && (
        <div
          className="border-t px-3 py-[9px]"
          style={{
            borderColor: renderedWatching
              ? 'color-mix(in oklab, var(--accent) 28%, transparent)'
              : 'var(--border)',
            background: 'color-mix(in oklab, var(--bg) 34%, transparent)',
          }}
        >
          <WatchersSurface data={watchers} />
        </div>
      )}
    </div>
  )
}
