'use client'

import { useEffect, useRef, useState } from 'react'
import { RowMetaChip } from './RowMetaChip'
import { SpotifyLogo } from '@/components/brand/spotify-logo'
import { EVENT_ROW_COPY } from './definitions/copy'
import { fitChips } from './lib/fit-chips'
import type { ChipSpec } from './lib/row-chips'

const CHIP_GAP = 5

// The mark widens the chip, so the measure copy has to carry it too or the fit
// pass sizes against a chip narrower than the one it renders.
const chipMark = (chip: ChipSpec) =>
  chip.mark === 'spotify' ? <SpotifyLogo size={11} /> : undefined

interface MetaRowProps {
  chips: ChipSpec[]
  /** Rule 2's budget, applied before the measure pass ever runs. */
  budget: number
  className?: string
}

/**
 * Rule 2's measure pass. The budget picks the candidates; the measure decides
 * how many of them the column can actually hold.
 *
 * The measuring copies are mounted permanently out of flow rather than being
 * the same nodes that render: chips the budget just rejected would otherwise
 * go on widening the meta column and feed a corrupted width back into the next
 * pass. `visibility: hidden` alone does not fix that — it still occupies
 * layout.
 *
 * A paired chip collapses to its first half before any whole chip drops. The
 * decision lives here rather than in the chip because the chip cannot see the
 * pressure that is about to delete it: every child sits in its own
 * content-sized span, which never overflows.
 */
export const MetaRow = ({ chips, budget, className }: MetaRowProps) => {
  const boxRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const collapsedRef = useRef<HTMLSpanElement>(null)
  const [visibleCount, setVisibleCount] = useState(chips.length)
  const [paired, setPaired] = useState(true)

  const candidates = chips.slice(0, budget)
  const pairIndex = candidates.findIndex(
    (chip) => chip.secondaryLabel !== undefined,
  )
  const pairChip = pairIndex === -1 ? undefined : candidates[pairIndex]
  // Re-measure when the chip set itself changes, not just when the box resizes.
  // The label is part of the signature because a chip can keep its key and
  // still change width — the freshness chip's relative time does exactly that.
  const chipKeys = candidates
    .map((chip) => `${chip.key}:${chip.label}:${chip.secondaryLabel ?? ''}`)
    .join('|')

  useEffect(() => {
    const box = boxRef.current
    const measure = measureRef.current
    if (!box || !measure) return

    const remeasure = () => {
      const pairedWidths = Array.from(measure.children).map(
        (child) => child.getBoundingClientRect().width,
      )
      const available = box.getBoundingClientRect().width

      if (fitChips(pairedWidths, available, CHIP_GAP) === pairedWidths.length) {
        setPaired(true)
        setVisibleCount(pairedWidths.length)
        return
      }

      // Collapsing costs half a genre; dropping costs a whole chip, so the
      // cheaper concession is tried first and the drop pass then runs against
      // the collapsed widths rather than the ones it just gave up on.
      const collapsedWidth = collapsedRef.current?.getBoundingClientRect().width
      const widths =
        collapsedWidth === undefined
          ? pairedWidths
          : pairedWidths.map((width, index) =>
              index === pairIndex ? collapsedWidth : width,
            )
      setPaired(false)
      setVisibleCount(fitChips(widths, available, CHIP_GAP))
    }

    remeasure()
    // The first pass is what the row actually needs; live remeasurement is an
    // enhancement, so a runtime without ResizeObserver renders rather than
    // throws.
    if (typeof ResizeObserver === 'undefined') return
    // Collapsing the pair changes the meta line's own height, so an unguarded
    // observer would re-fire on the mutation its own last pass caused. Only a
    // width change can change the answer, so only a width change re-runs it.
    let lastWidth = box.getBoundingClientRect().width
    const observer = new ResizeObserver(() => {
      const width = box.getBoundingClientRect().width
      if (width === lastWidth) return
      lastWidth = width
      remeasure()
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [chipKeys, pairIndex])

  if (candidates.length === 0) return null

  return (
    <div ref={boxRef} className={className} style={{ position: 'relative' }}>
      <div
        data-testid="row-meta"
        className="flex items-center"
        style={{ gap: CHIP_GAP }}
      >
        {candidates.slice(0, visibleCount).map((chip) => {
          const showsPair = paired && chip.secondaryLabel !== undefined
          return (
            <RowMetaChip
              key={chip.key}
              label={chip.label}
              tone={chip.tone}
              srLabel={chip.srLabel}
              icon={chipMark(chip)}
              secondaryLabel={showsPair ? chip.secondaryLabel : undefined}
              srSuffix={
                !showsPair && chip.secondaryLabel !== undefined
                  ? EVENT_ROW_COPY.a11y.droppedGenre(chip.secondaryLabel)
                  : undefined
              }
            />
          )
        })}
      </div>
      <div
        ref={measureRef}
        aria-hidden
        className="flex items-center"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          gap: CHIP_GAP,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {candidates.map((chip) => (
          <RowMetaChip
            key={chip.key}
            label={chip.label}
            tone={chip.tone}
            icon={chipMark(chip)}
            secondaryLabel={chip.secondaryLabel}
            hidden
          />
        ))}
      </div>
      {/* The collapsed half, measured beside the paired set so the fit pass can
          price the concession before it makes it. Its own container, because
          the widths above are read positionally. */}
      {pairChip ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <RowMetaChip
            ref={collapsedRef}
            label={pairChip.label}
            tone={pairChip.tone}
            hidden
          />
        </span>
      ) : null}
    </div>
  )
}
