'use client'

import { useEffect, useRef, useState } from 'react'
import { RowMetaChip } from './RowMetaChip'
import { fitChips } from './lib/fit-chips'
import type { ChipSpec } from './lib/row-chips'

const CHIP_GAP = 5

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
 */
export const MetaRow = ({ chips, budget, className }: MetaRowProps) => {
  const boxRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(chips.length)

  const candidates = chips.slice(0, budget)
  // Re-measure when the chip set itself changes, not just when the box resizes.
  // The label is part of the signature because a chip can keep its key and
  // still change width — the freshness chip's relative time does exactly that.
  const chipKeys = candidates
    .map((chip) => `${chip.key}:${chip.label}`)
    .join('|')

  useEffect(() => {
    const box = boxRef.current
    const measure = measureRef.current
    if (!box || !measure) return

    const remeasure = () => {
      const widths = Array.from(measure.children).map(
        (child) => child.getBoundingClientRect().width,
      )
      setVisibleCount(
        fitChips(widths, box.getBoundingClientRect().width, CHIP_GAP),
      )
    }

    remeasure()
    // The first pass is what the row actually needs; live remeasurement is an
    // enhancement, so a runtime without ResizeObserver renders rather than
    // throws.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(remeasure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [chipKeys])

  if (candidates.length === 0) return null

  return (
    <div ref={boxRef} className={className} style={{ position: 'relative' }}>
      <div
        data-testid="row-meta"
        className="flex items-center"
        style={{ gap: CHIP_GAP }}
      >
        {candidates.slice(0, visibleCount).map((chip) => (
          <RowMetaChip
            key={chip.key}
            label={chip.label}
            tone={chip.tone}
            srLabel={chip.srLabel}
          />
        ))}
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
            hidden
          />
        ))}
      </div>
    </div>
  )
}
