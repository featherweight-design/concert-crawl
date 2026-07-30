'use client'

import { useState } from 'react'
import type { EventWatchersResponse } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { NAMED_CAP, watchersToParts } from '@/lib/watchers'
import { WatcherAvatarStack } from './WatcherAvatarStack'
import { WatchersRoster } from './WatchersRoster'
import { WatchersSkeleton } from './WatchersSkeleton'

interface WatchersSurfaceProps {
  data: EventWatchersResponse | undefined
  loading?: boolean
  expandable?: boolean
}

const copy = CONSUMER_COPY.watchers

/**
 * The social-proof row under the Watch button. Renders as prose, not a list:
 * `role="group"` with the whole sentence as its label so a screen reader
 * announces "marisol, dev_ftw & priya + 11 more in the crawl, watching." in
 * one breath, with the avatar discs decorative.
 *
 * Renders nothing at all when nobody else is watching — an empty social row is
 * worse than no social row.
 */
export const WatchersSurface = ({
  data,
  loading = false,
  expandable = true,
}: WatchersSurfaceProps) => {
  const [expanded, setExpanded] = useState(false)

  if (loading) return <WatchersSkeleton />
  if (!data || data.total === 0) return null

  const { parts, aria, others, anonOnly, total, shown } = watchersToParts(data)
  const anonymousCount = total - data.named.length
  // When nobody has a handle there is nothing to name, so `others` equals
  // `total` and can't tell us whether the discs already fit — only the disc cap
  // can. Naming at least one watcher makes `others` the real overflow.
  const canExpand = expandable && (anonOnly ? total > NAMED_CAP : others > 0)

  return (
    <div>
      <div
        role="group"
        aria-label={aria}
        className="flex flex-wrap items-center gap-2"
        style={{ minHeight: 28 }}
      >
        <WatcherAvatarStack
          watchers={shown}
          anonymousDiscs={anonOnly ? Math.min(NAMED_CAP, total) : 0}
          overflow={anonOnly ? total - Math.min(NAMED_CAP, total) : others}
        />
        <span
          aria-hidden
          className="text-[12.5px] leading-[1.4] tracking-[-0.005em] text-fg-muted"
        >
          {parts.map((part, index) =>
            part.kind === 'name' ? (
              <span key={index} className="font-bold text-fg">
                {part.value}
              </span>
            ) : (
              <span key={index}>{part.value}</span>
            ),
          )}
        </span>
        {canExpand && (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
            // 44px tap target on mobile, tightened to the 28px row on desktop.
            className="inline-flex min-h-[44px] items-center rounded-[3px] text-xs font-bold tracking-[-0.005em] text-signal hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-[28px]"
            style={{ outlineColor: 'var(--focus)' }}
          >
            {expanded ? copy.rosterHide : copy.rosterToggle(total)}
          </button>
        )}
      </div>
      {anonOnly && (
        <p className="mt-1 font-mono text-[9.5px] font-semibold tracking-[0.04em] text-fg-subtle">
          {copy.countOnlyHonest}
        </p>
      )}
      {expanded && (
        <WatchersRoster named={data.named} anonymousCount={anonymousCount} />
      )}
    </div>
  )
}
