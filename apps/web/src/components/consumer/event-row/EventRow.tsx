'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EventImage } from '../event-image'
import { EventTitleBlock } from '@/components/consumer/event-title-block'
import { WhenWhere } from './WhenWhere'
import { MetaRow } from './MetaRow'
import { PriceStack } from './PriceStack'
import { EVENT_ROW_COPY as copy } from './definitions/copy'
import { SURFACES, type RowSurface } from './definitions/surfaces'
import { rowChips, chipBudget } from './lib/row-chips'
import type { EventRowShow } from './lib/row-model'

const NARROW_AT = 360

interface EventRowProps {
  show: EventRowShow
  surface: RowSurface
  /** Outside the four-line contract and outside the chip budget. */
  footer?: ReactNode
  /** The surface's own row action, rendered in the gutter. */
  action?: ReactNode
  className?: string
}

export const EventRow = ({
  show,
  surface,
  footer,
  action,
  className,
}: EventRowProps) => {
  const rowRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  const config = SURFACES[surface]

  // Measured, not passed in. A caller-supplied `narrow` flag is what clipped
  // the 390 Watching list, which never passed one.
  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const remeasure = () => {
      const { width } = row.getBoundingClientRect()
      // A zero width is an unlaid-out row, not a 0px one. Reading it as narrow
      // is how a row in a layout-less environment gets stuck at 44px art.
      if (width <= 0) return
      setNarrow(width <= NARROW_AT)
    }
    remeasure()
    // The first pass is what the row actually needs; live remeasurement is an
    // enhancement, so a runtime without ResizeObserver renders rather than
    // throws.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(remeasure)
    observer.observe(row)
    return () => observer.disconnect()
  }, [])

  const artSize = narrow ? 44 : 56
  const hasSupportLine = show.supports.length > 0
  const chips = rowChips(show, surface)
  const isSuppressed =
    show.lifecycle === 'cancelled' || show.lifecycle === 'postponed'

  return (
    <div
      className={cn(
        config.carded && 'rounded-lg border border-border bg-surface-1 p-3',
        className,
      )}
    >
      <div
        ref={rowRef}
        data-testid="event-row"
        data-narrow={narrow || undefined}
        className="event-row group relative flex items-start"
        style={{ gap: narrow ? 10 : 14 }}
      >
        <div
          className="relative shrink-0 overflow-hidden rounded-md"
          style={{
            width: artSize,
            height: artSize,
            // Sold out dims the artwork, never the row: a row-level opacity
            // pushes --fg-muted below the AA contrast floor.
            opacity: show.status === 'soldout' || isSuppressed ? 0.45 : 1,
          }}
        >
          <EventImage
            src={show.imageUrl}
            alt={show.headliner}
            artist={show.headliner}
            identityScale="tile"
            className="h-full w-full"
          />
          {show.isWatching && (
            // Watching state is not a row object — it reports, it does not act.
            <span
              role="img"
              aria-label={copy.a11y.watchingTick(show.headliner)}
              data-testid="row-watching-tick"
              className="absolute bottom-0 right-0 flex items-center justify-center rounded-tl-md bg-surface-1"
              style={{ padding: 2 }}
            >
              <Eye size={11} color="var(--signal)" />
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* The artist name is the row's link, stretched over the whole row
              by a ::after rule in globals.css. A click handler on the wrapping
              div would give the row no accessible name and no keyboard path. */}
          <Link
            href={`/events/${show.id}`}
            className="event-row-stretch group/eventtitle block min-w-0"
          >
            <EventTitleBlock
              headliner={show.headliner}
              supportingArtists={
                show.supports.length > 0 ? show.supports : null
              }
              tourName={show.tourName}
              fallbackTitle={show.fallbackTitle}
              status={show.lifecycle}
              surface="card"
              maxInline={2}
            />
          </Link>
          <WhenWhere
            surface={surface}
            dateLabel={show.dateLabel}
            timeLabel={show.timeLabel}
            venueName={show.venueName}
            venueSlug={show.venueSlug}
          />
          <MetaRow
            chips={chips}
            budget={chipBudget(hasSupportLine)}
            className="mt-1"
          />
        </div>

        <PriceStack show={show} surface={surface} narrow={narrow} />

        {/* Reserved only where the surface has an action — reserving it on
            Browse collapses the title column to 80px at 320. */}
        {config.hasActionGutter && (
          <div className="flex shrink-0 justify-end" style={{ width: 36 }}>
            {action}
          </div>
        )}
      </div>
      {footer}
    </div>
  )
}
