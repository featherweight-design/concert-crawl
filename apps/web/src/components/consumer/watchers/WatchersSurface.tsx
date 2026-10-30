'use client'

import { useId } from 'react'
import type { EventWatchersResponse } from '@concert-crawl/types'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { useIsMobileViewport } from '@/lib/hooks/useIsMobileViewport'
import {
  CCOverlay,
  CCOverlayHost,
  useOverlayTrigger,
} from '@/components/ui/cc-overlay'
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
  const isMobile = useIsMobileViewport()
  // Only the click transitions are wired up. The hover-intent handlers exist
  // for explainer tips, where a panel that opens under the pointer is a
  // convenience; a roster is content you asked for, and one that appeared on
  // mouse-through would be an accident every time.
  const trigger = useOverlayTrigger({ isMobile })
  const panelId = useId()
  const labelId = useId()

  if (loading) return <WatchersSkeleton />
  if (!data || data.total === 0) return null

  const { parts, aria, others, anonOnly, total, shown } = watchersToParts(data)
  const anonymousCount = total - data.named.length
  // When nobody has a handle there is nothing to name, so `others` equals
  // `total` and can't tell us whether the discs already fit — only the disc cap
  // can. Naming at least one watcher makes `others` the real overflow.
  const canExpand = expandable && (anonOnly ? total > NAMED_CAP : others > 0)

  // Analytics autocapture records every ancestor's attributes with a click,
  // and the "see all" button sits inside this group, so a sentence that names
  // other readers is read from a hidden span autocapture skips rather than
  // from an aria-label. The names on screen are skipped the same way.
  const namesSomeone = !anonOnly

  return (
    <div>
      {namesSomeone && (
        <span id={labelId} hidden className="ph-no-capture">
          {aria}
        </span>
      )}
      <div
        role="group"
        {...(namesSomeone
          ? { 'aria-labelledby': labelId }
          : { 'aria-label': aria })}
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
              <span key={index} className="ph-no-capture font-bold text-fg">
                {part.value}
              </span>
            ) : (
              <span key={index}>{part.value}</span>
            ),
          )}
        </span>
        {canExpand && (
          <span className="relative inline-flex">
            <button
              ref={trigger.triggerRef}
              type="button"
              aria-expanded={trigger.open}
              aria-haspopup="dialog"
              aria-controls={trigger.open ? panelId : undefined}
              onClick={trigger.toggle}
              // 44px tap target on mobile, tightened to the 28px row on desktop.
              className="inline-flex min-h-[44px] items-center rounded-[3px] text-xs font-bold tracking-[-0.005em] text-signal hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:min-h-[28px]"
              style={{ outlineColor: 'var(--focus)' }}
            >
              {trigger.open ? copy.rosterHide : copy.rosterToggle(total)}
            </button>
            {trigger.open &&
              (isMobile ? (
                <CCOverlayHost>
                  <CCOverlay
                    id={panelId}
                    mode="sheet"
                    title={copy.rosterTitle}
                    onClose={trigger.close}
                  >
                    <WatchersRoster
                      named={data.named}
                      anonymousCount={anonymousCount}
                    />
                  </CCOverlay>
                </CCOverlayHost>
              ) : (
                <CCOverlay
                  id={panelId}
                  mode="popover"
                  title={copy.rosterTitle}
                  anchor={trigger.triggerNode}
                  placement="top"
                  align="end"
                  width={260}
                  onClose={trigger.close}
                >
                  <WatchersRoster
                    named={data.named}
                    anonymousCount={anonymousCount}
                  />
                </CCOverlay>
              ))}
          </span>
        )}
      </div>
      {anonOnly && (
        <p className="mt-1 font-mono text-[9.5px] font-semibold tracking-[0.04em] text-fg-subtle">
          {copy.countOnlyHonest}
        </p>
      )}
    </div>
  )
}
