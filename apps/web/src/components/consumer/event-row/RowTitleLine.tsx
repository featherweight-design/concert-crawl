'use client'

import { useEffect, useRef, useState } from 'react'
import { EVENT_ROW_COPY } from './definitions/copy'
import { tourClauseFits } from './lib/tour-clause'

/**
 * The row's own type ramp for line 1. It used to live in `EventTitleBlock`'s
 * `RAMP` under the `card` key, shared with event detail's hero and detail
 * surfaces; the row and detail have diverged far enough that sharing one
 * component was making the row carry detail-shaped baggage, so the numbers
 * move here and the row stops reading that ramp at all.
 *
 * `head`/`narrowHead` and the column gap are carried over unchanged from the
 * shipped `card` entry, so nothing about the row's existing rendering moves.
 */
const RAMP = {
  head: 15.5,
  /** The ≤360px step, measured by `EventRow` and passed down. */
  narrowHead: 14.5,
  /**
   * The clause sits four points under the headliner — small enough to read as
   * an aside, large enough to survive the mono face.
   */
  clauseDrop: 4,
} as const

/** Flex gap between the headliner and the clause. */
const GAP = 7

/**
 * Ceiling 1 — a per-mount write budget that nothing but a remount clears. A
 * pathological layout terminates because it runs out of writes, not because it
 * settles.
 */
const MAX_WRITES = 12

/**
 * Ceiling 2 — a per-width episode cap. It resets when the observed width
 * actually moves, which is what keeps a normal resize responsive; the outer
 * budget is what makes the whole thing provably terminate.
 */
const MAX_STEPS_PER_WIDTH = 3

/** Below this the observer treats the callback as its own echo. */
const WIDTH_EPSILON = 1

interface RowTitleLineProps {
  headliner: string
  tourName: string | null
  /** Rule 1 — the surface decides whether a tour name is worth line 1's room. */
  showsTour: boolean
  /**
   * Rule 1's corollary — the surface already states the artist, so the tour
   * name takes the title slot outright. Falls back to the headliner when the
   * show has no tour name.
   */
  promotesTour?: boolean
  /** The ≤360px step of the row ramp. */
  narrow?: boolean
}

/**
 * Line 1 — the headliner, and a tour clause when the line can hold one whole.
 *
 * The clause is measured, not breakpointed: the measuring copies of the
 * headliner and the clause are mounted permanently out of flow, so the widths
 * the fit reads are natural widths that no state change can move. That is what
 * lets the observer watch a box whose width is set entirely by the parent —
 * observing the node the flag resizes is how a measure pass re-fires on its
 * own mutation and locks the main thread with no console error.
 */
export const RowTitleLine = ({
  headliner,
  tourName,
  showsTour,
  promotesTour = false,
  narrow = false,
}: RowTitleLineProps) => {
  const boxRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [fits, setFits] = useState(true)
  // State is mirrored into a ref so the measure pass can compare against the
  // current answer without making itself depend on the render that produced it.
  const fitsRef = useRef(true)
  const writesRef = useRef(0)
  const stepsRef = useRef(0)
  const lastWidthRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  const clause = showsTour && tourName ? tourName : null
  const promoted = promotesTour && tourName ? tourName : null
  const title = promoted ?? headliner
  const headSize = narrow ? RAMP.narrowHead : RAMP.head
  const clauseSize = headSize - RAMP.clauseDrop

  const titleStyle = {
    fontSize: headSize,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    // 1.35 is load-bearing, not taste: `truncate` clips to the line box, so a
    // tighter leading shears accented caps and descenders.
    lineHeight: 1.35,
  } as const

  const clauseStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: clauseSize,
    fontWeight: 500,
    letterSpacing: '0.01em',
    // The clause shares the headliner's leading, so adding one can never add
    // height to the line box it sits in.
    lineHeight: 1.35,
    whiteSpace: 'nowrap',
  } as const

  useEffect(() => {
    const box = boxRef.current
    const measure = measureRef.current
    // No clause, no measuring copies, nothing to decide.
    if (!box || !measure) return

    // A changed headliner, clause or type size is a new question, so the width
    // episode starts over. The write budget deliberately does not.
    lastWidthRef.current = null
    stepsRef.current = 0

    const decide = (available: number) => {
      const [titleWidth, clauseWidth] = Array.from(measure.children).map(
        (child) => child.getBoundingClientRect().width,
      )
      const next = tourClauseFits(
        titleWidth ?? 0,
        clauseWidth ?? 0,
        available,
        GAP,
      )
      if (next === fitsRef.current) return
      // Both ceilings gate the same single write path, so no state change can
      // route around them.
      if (writesRef.current >= MAX_WRITES) return
      if (stepsRef.current >= MAX_STEPS_PER_WIDTH) return
      writesRef.current += 1
      stepsRef.current += 1
      fitsRef.current = next
      setFits(next)
    }

    const remeasure = () => {
      const { width } = box.getBoundingClientRect()
      const last = lastWidthRef.current
      // The observed box is parent-driven, so a callback reporting the same
      // width is this pass hearing its own echo. Ignore it.
      if (last !== null && Math.abs(width - last) < WIDTH_EPSILON) return
      lastWidthRef.current = width
      stepsRef.current = 0
      decide(width)
    }

    remeasure()
    // The first pass is what the row actually needs; live remeasurement is an
    // enhancement, so a runtime without ResizeObserver renders rather than
    // throws.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      // One measurement per frame at most, and never a synchronous write from
      // inside the observer callback.
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        remeasure()
      })
    })
    observer.observe(box)
    return () => {
      observer.disconnect()
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [title, clause, headSize, clauseSize])

  return (
    <div
      ref={boxRef}
      data-testid="row-title-line"
      className="flex min-w-0 items-baseline"
      style={{ position: 'relative', gap: GAP }}
    >
      {/* First in reading order, so the row still announces the act before the
          tour it is out on. The page states the artist beside the list; a
          screen reader arriving on the row has no such adjacency. */}
      {promoted !== null && (
        <span className="sr-only" data-testid="row-promoted-artist">
          {headliner}
        </span>
      )}
      <div
        data-testid="row-title"
        className="min-w-0 truncate text-fg transition-colors group-hover/eventtitle:text-signal"
        style={titleStyle}
      >
        {title}
      </div>

      {clause !== null && fits && (
        <span
          data-testid="row-tour-clause"
          className="shrink-0 text-fg-subtle"
          style={clauseStyle}
        >
          <span aria-hidden style={{ opacity: 0.5, marginRight: 6 }}>
            {EVENT_ROW_COPY.glyphs.separator}
          </span>
          {clause}
        </span>
      )}

      {/* Out of flow and permanently mounted: the fit reads natural widths, so
          dropping the clause can never change the numbers the next pass sees. */}
      {clause !== null && (
        // The zero-size clipping shell is load-bearing: every ancestor up to
        // the viewport has `overflow: visible`, so an unclipped nowrap copy
        // wider than the column propagates scrollable overflow all the way out
        // and gives the page a horizontal scrollbar at the 320px baseline.
        // Clipping is paint-only, so the natural widths still measure.
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            overflow: 'hidden',
          }}
        >
          <span
            ref={measureRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              visibility: 'hidden',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={titleStyle}>{title}</span>
            {/* The separator and its margin are part of what the clause costs,
                so the measure copy has to carry them too. */}
            <span style={clauseStyle}>
              <span style={{ marginRight: 6 }}>
                {EVENT_ROW_COPY.glyphs.separator}
              </span>
              {clause}
            </span>
          </span>
        </span>
      )}
    </div>
  )
}
