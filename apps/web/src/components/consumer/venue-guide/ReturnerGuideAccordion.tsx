'use client'

import { useId, useState } from 'react'
import type { VenueGuideChip } from '@concert-crawl/types'
import { CONSUMER_COPY } from '../definitions/copy'

const copy = CONSUMER_COPY.venueGuide

/** Topics named in the collapsed strip before it falls back to `+N`. */
const PREVIEW_CHIP_COUNT = 3

interface ReturnerGuideAccordionProps {
  /** Authored chips in display order — accessibility first. */
  chips: VenueGuideChip[]
  children: React.ReactNode
}

/**
 * The guide for someone who has already been to this room. Accent-tinted
 * rather than muted: it is still a feature worth noticing, just not one that
 * should take the page over on the fourth visit.
 */
export const ReturnerGuideAccordion = ({
  chips,
  children,
}: ReturnerGuideAccordionProps) => {
  const [open, setOpen] = useState(false)
  const summaryId = useId()

  const previewLabels = chips
    .slice(0, PREVIEW_CHIP_COUNT)
    .map((chip) => copy.chipLabels[chip.chipType])
  const extraCount = Math.max(chips.length - PREVIEW_CHIP_COUNT, 0)

  return (
    <div
      data-testid="returner-guide-accordion"
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'color-mix(in oklab, var(--accent) 9%, var(--bg))',
        border: '1px solid color-mix(in oklab, var(--accent) 30%, transparent)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-label={copy.returner.toggleAriaLabel}
        // The stable aria-label keeps the control's name from changing as the
        // preview text does, but on its own it would hide the topic list and
        // the "+N" from screen readers entirely. Describing the button with the
        // already-visible summary gives that back without a duplicate node.
        aria-describedby={summaryId}
        className="flex w-full cursor-pointer items-center gap-3 text-left"
        style={{ minHeight: 44, padding: '12px 14px', boxSizing: 'border-box' }}
      >
        <span
          className="flex shrink-0 items-center justify-center"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'color-mix(in oklab, var(--accent) 18%, transparent)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
            <circle
              cx="5"
              cy="14.5"
              r="1.5"
              fill="var(--accent)"
              opacity="0.55"
            />
            <circle cx="10" cy="10" r="2" fill="var(--accent)" opacity="0.8" />
            <circle cx="15" cy="5" r="2.6" fill="var(--signal)" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
            }}
          >
            {copy.sectionEyebrow}
          </span>
          <span
            id={summaryId}
            className="block truncate"
            style={{
              marginTop: 2,
              fontSize: '12.5px',
              color: 'var(--fg-muted)',
            }}
          >
            {open
              ? copy.returner.expandedSummary
              : copy.returner.preview(previewLabels, extraCount)}
          </span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 12 12"
          aria-hidden="true"
          // The transition is dropped under reduced motion, not the rotation
          // itself — the chevron is the only visual marker of open state, so
          // freezing it would remove information rather than movement.
          className="shrink-0 transition-transform motion-reduce:transition-none"
          style={{
            color: 'var(--accent)',
            transform: `rotate(${open ? 180 : 0}deg)`,
            transitionDuration: '150ms',
          }}
        >
          <path
            d="M3 5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  )
}
