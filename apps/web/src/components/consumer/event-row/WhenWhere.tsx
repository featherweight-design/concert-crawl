'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  chooseLevel,
  shortenDate,
  type WhenWhereWidths,
  type WhenWhereLevel,
} from './lib/when-where'
import { whenWhereUnits, type RowSurface } from './definitions/surfaces'
import { EVENT_ROW_COPY } from './definitions/copy'

const SEPARATOR = EVENT_ROW_COPY.glyphs.separator
const GAP = 5

// The measured span sits outside the rendered line, so it inherits none of the
// line's typography. Every property that changes a glyph's advance width has to
// be set on both, or the ladder picks its level from the wrong font — which is
// why the size comes from one place rather than being written out twice.
const typeAt = (narrow: boolean) =>
  ({
    fontFamily: 'var(--font-mono)',
    fontSize: narrow ? 11 : 11.5,
    letterSpacing: '0.02em',
  }) as const

interface WhenWhereProps {
  surface: RowSurface
  dateLabel: string
  timeLabel: string | null
  venueName: string
  venueSlug: string
  narrow: boolean
}

/**
 * Line 3. The units it renders come from the surface (Rule 1); the level it
 * renders them at comes from measuring this box.
 *
 * The separators are real elements with a flex `gap` around them rather than
 * `" · "` inside a string — flex trims leading and trailing whitespace in
 * children, so the spaces in a literal vanish and the glyph collides with the
 * text on both sides.
 */
export const WhenWhere = ({
  surface,
  dateLabel,
  timeLabel,
  venueName,
  venueSlug,
  narrow,
}: WhenWhereProps) => {
  const TYPE = typeAt(narrow)
  const boxRef = useRef<HTMLParagraphElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [level, setLevel] = useState<WhenWhereLevel>(0)

  const rendered = whenWhereUnits(surface)
  const showsDateUnit = rendered.includes('date')
  const showsTimeUnit = rendered.includes('time') && timeLabel !== null
  const showsVenueUnit = rendered.includes('venue')
  // Memoised so the measure effect can depend on the unit set itself rather
  // than on three loose booleans it has to keep in sync by hand.
  const units = useMemo(
    () => ({
      showsDate: showsDateUnit,
      showsTime: showsTimeUnit,
      showsVenue: showsVenueUnit,
    }),
    [showsDateUnit, showsTimeUnit, showsVenueUnit],
  )
  const shortDate = shortenDate(dateLabel)

  useEffect(() => {
    const box = boxRef.current
    const measure = measureRef.current
    if (!box || !measure) return

    const remeasure = () => {
      const [full, short, time, separator] = Array.from(measure.children).map(
        (child) => child.getBoundingClientRect().width,
      )
      const widths: WhenWhereWidths = {
        fullDate: full ?? 0,
        shortDate: short ?? 0,
        time: time ?? 0,
        // The separator unit is the glyph plus the flex gap on each side of it.
        separator: (separator ?? 0) + GAP * 2,
      }
      setLevel(chooseLevel(widths, box.getBoundingClientRect().width, units))
    }

    remeasure()
    // The first pass is what the row actually needs; live remeasurement is an
    // enhancement, so a runtime without ResizeObserver renders rather than
    // throws.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(remeasure)
    observer.observe(box)
    return () => observer.disconnect()
    // The measured strings, the unit set and the type size are the only inputs
    // to the level. The venue name is not among them: it is the one unit
    // allowed to ellipsis, so its width never moves the ladder.
  }, [dateLabel, timeLabel, units, narrow])

  const showsVenue = showsVenueUnit && level < 2
  const showsTime = showsTimeUnit && level < 3
  const dateText = level >= 1 ? shortDate : dateLabel

  // Each part carries its own stable key: the list shrinks and grows as the
  // level changes, so an index key would let React reuse the venue's node for
  // the time.
  const parts: { key: string; node: React.ReactNode }[] = []
  if (showsDateUnit) {
    // Date and time never shrink; the venue is the only unit allowed to
    // ellipsis, because losing the date is the bug this system exists to fix.
    parts.push({
      key: 'date',
      node: <span style={{ flexShrink: 0 }}>{dateText}</span>,
    })
  }
  if (showsTime) {
    parts.push({
      key: 'time',
      node: <span style={{ flexShrink: 0 }}>{timeLabel}</span>,
    })
  }
  if (showsVenue) {
    parts.push({
      key: 'venue',
      node: (
        <Link
          href={`/venues/${venueSlug}`}
          data-testid="venue-name-link"
          className="min-w-0 truncate hover:underline"
        >
          {venueName}
        </Link>
      ),
    })
  }

  const line = (
    <p
      ref={boxRef}
      data-testid="when-where"
      data-level={level}
      className="mt-0.5 flex min-w-0 items-baseline text-fg-muted"
      style={{
        position: 'relative',
        gap: GAP,
        ...TYPE,
      }}
    >
      {parts.map((part, index) => (
        <React.Fragment key={part.key}>
          {index > 0 && (
            <span aria-hidden style={{ flexShrink: 0, opacity: 0.4 }}>
              {SEPARATOR}
            </span>
          )}
          {part.node}
        </React.Fragment>
      ))}
    </p>
  )

  return (
    <>
      {line}
      {/* Out of flow, and a sibling rather than a child, so the strings can be
          measured without landing in the line's own text content. */}
      <span
        ref={measureRef}
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          ...TYPE,
        }}
      >
        <span>{dateLabel}</span>
        <span>{shortDate}</span>
        <span>{timeLabel ?? ''}</span>
        <span>{SEPARATOR}</span>
      </span>
    </>
  )
}
