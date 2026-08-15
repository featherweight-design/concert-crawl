'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { EventImage } from '../event-image'
import { SupportingLine } from '@/components/consumer/event-title-block'
import { RowTitleLine } from './RowTitleLine'
import { WhenWhere } from './WhenWhere'
import { MetaRow } from './MetaRow'
import { PriceStack } from './PriceStack'
import { EVENT_ROW_COPY as copy } from './definitions/copy'
import { SURFACES, type RowSurface } from './definitions/surfaces'
import { rowChips, chipBudget } from './lib/row-chips'
import { isStruck, resolveRowStatus } from './lib/row-status'
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
  const status = resolveRowStatus(show.lifecycle, show.status)
  const struck = isStruck(status)

  return (
    <div
      className={cn(
        config.carded && 'border border-border bg-surface-1',
        className,
      )}
      style={{
        // The card's left inset is tighter at narrow so the art keeps its size
        // rather than the title column paying for the padding.
        padding: config.carded
          ? `13px ${config.hasActionGutter ? 8 : 12}px 13px ${narrow ? 10 : 14}px`
          : '13px 0',
        borderRadius: config.carded ? 12 : undefined,
      }}
    >
      <div
        ref={rowRef}
        data-testid="event-row"
        data-narrow={narrow || undefined}
        className="event-row group relative flex items-center"
        style={{ gap: narrow ? 10 : 14 }}
      >
        {/* The clip lives on the inner box, not here: the tick overhangs the
            artwork by 3px and would be cut off by a clip on this wrapper. */}
        <div
          className="relative shrink-0"
          style={{ width: artSize, height: artSize }}
        >
          <div
            className="h-full w-full overflow-hidden rounded-md"
            style={{
              // Sold out dims the artwork, never the row: a row-level opacity
              // pushes --fg-muted below the AA contrast floor.
              opacity: struck || show.status === 'soldout' ? 0.55 : 1,
            }}
          >
            <EventImage
              src={show.imageUrl}
              artistPhotoUrl={show.artistPhotoUrl}
              alt={show.headliner}
              artist={show.headliner}
              identityScale="tile"
              className="h-full w-full"
            />
          </div>
          {show.isWatching && (
            // Watching state is not a row object — it reports, it does not act.
            // --accent is the watching colour; the Following chip must never
            // borrow it, and this must never borrow --signal.
            <span
              role="img"
              aria-label={copy.a11y.watchingTick(show.headliner)}
              data-testid="row-watching-tick"
              className="absolute rounded-full bg-accent"
              style={{
                top: -3,
                right: -3,
                width: 12,
                height: 12,
                border: '2px solid var(--bg)',
              }}
            />
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
            <RowTitleLine
              headliner={show.headliner}
              tourName={show.tourName}
              showsTour={config.showsTour}
              narrow={narrow}
            />
            {/* Line 2. It stays inside the row's stretched anchor exactly as it
                was, and the 3px is the column gap it used to inherit from
                `EventTitleBlock` — the row's height must not move here. */}
            {hasSupportLine && (
              <div style={{ marginTop: 3 }}>
                <SupportingLine
                  artists={show.supports}
                  surface="card"
                  narrow={narrow}
                  maxInline={2}
                />
              </div>
            )}
          </Link>
          <WhenWhere
            surface={surface}
            dateLabel={show.dateLabel}
            timeLabel={show.timeLabel}
            venueName={show.venueName}
            venueSlug={show.venueSlug}
            narrow={narrow}
            struck={struck}
          />
          <MetaRow
            chips={chips}
            budget={chipBudget(hasSupportLine)}
            className="mt-0.5"
          />
        </div>

        {config.showsPrice && (
          <PriceStack show={show} surface={surface} narrow={narrow} />
        )}

        {/* Reserved only where the surface has an action — reserving it on
            Browse collapses the title column to 80px at 320. */}
        {config.hasActionGutter && (
          <div
            className="flex shrink-0 items-center justify-center"
            style={{ width: 36 }}
          >
            {action}
          </div>
        )}
      </div>
      {footer}
    </div>
  )
}
