'use client'

import { useAuth } from '@clerk/nextjs'
import { WatchShowButton } from '@/components/consumer/watch-show-button/WatchShowButton'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { useEventWatchers } from '@/lib/queries/use-event-watchers'
import { useWatching } from '@/lib/queries/use-watching'
import { WatchersSurface } from './WatchersSurface'

interface WatchZoneProps {
  eventId: string
  initialWatching?: boolean
}

/**
 * The event-detail Watch strip: the Watch button, the alerts hint, and the
 * social-proof surface.
 *
 * The hint lives here rather than inside WatchShowButton because the button
 * also renders on every EventCard and HeroEventCard — putting it in the button
 * would drop a line of copy under every card in the browse grid.
 */
export const WatchZone = ({
  eventId,
  initialWatching = false,
}: WatchZoneProps) => {
  const { isSignedIn } = useAuth()
  const { data: watchedShows } = useWatching()
  const { data: watchers, isPending } = useEventWatchers(eventId)

  // Mirrors WatchShowButton's derivation so the hint flips with the button
  // rather than lagging a render behind — same hook, same cache entry, no
  // extra request and no lifted state.
  const cacheIsReady = watchedShows !== undefined
  const isWatching = cacheIsReady
    ? watchedShows.some((show) => show.eventId === eventId)
    : initialWatching

  return (
    <div className="flex flex-col items-start gap-3">
      <WatchShowButton eventId={eventId} initialWatching={initialWatching} />
      {!isWatching && (
        <p className="-mt-1 text-[11.5px] tracking-[-0.005em] text-fg-subtle">
          {CONSUMER_COPY.watchers.watchHint}
        </p>
      )}
      <WatchersSurface data={watchers} loading={isPending && !!isSignedIn} />
    </div>
  )
}
