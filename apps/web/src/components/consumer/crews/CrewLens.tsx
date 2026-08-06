'use client'

// The Browse crew lens (#1226 PR-6, handoff crew-browse-lens.jsx).
//
// A crew is deliberately NOT a filter. Every chip in the filter bar narrows the
// calendar by an attribute of the show — date, venue, price, genre — and a crew
// narrows it by who. Adding a fifth chip would put it in a row it does not
// belong to and thicken a bar two design passes went out of their way to keep
// thin. So the lens lives in the title-block row that already exists above the
// chips, and the filter bar's own markup is untouched.

import { useId } from 'react'
import type { CrewSummary } from '@concert-crawl/types'

import { CrewPatch } from '@/components/consumer/crew-patch'
import { useIsMobileViewport } from '@/lib/hooks/useIsMobileViewport'
import {
  CCOverlay,
  CCOverlayHost,
  useOverlayTrigger,
} from '@/components/ui/cc-overlay'
import { CREWS_COPY } from './definitions/copy'

const COPY = CREWS_COPY

export const LensGlyph = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <rect
      x="1.2"
      y="1.2"
      width="13.6"
      height="13.6"
      rx="4.6"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <circle
      cx="8"
      cy="8"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" />
  </svg>
)

const Chevron = ({ size = 9 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
    <path
      d="M2 4l3 3 3-3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

const PickerCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3 8.5l3.2 3.2L13 5"
      stroke="var(--signal)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

interface CrewPickerRowProps {
  /** null is the "Everyone" reset row, which stands in for "Any date". */
  crew: CrewSummary | null
  selected: boolean
  compact: boolean
  onSelect: () => void
}

const CrewPickerRow = ({
  crew,
  selected,
  compact,
  onSelect,
}: CrewPickerRowProps) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className="flex w-full cursor-pointer items-center gap-3 text-left"
    style={{
      minHeight: 56,
      padding: compact ? '10px 14px' : '12px 20px',
      borderBottom: '1px solid var(--border)',
      boxSizing: 'border-box',
      background: selected ? 'var(--surface-1)' : 'transparent',
    }}
  >
    {crew === null ? (
      <span
        className="inline-flex shrink-0 items-center justify-center"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          border: '1.5px dashed var(--border-strong)',
          color: 'var(--fg-subtle)',
        }}
      >
        <LensGlyph size={16} />
      </span>
    ) : (
      <CrewPatch
        crewId={crew.id}
        patchSalt={crew.patchSalt}
        size={38}
        scale="tile"
      />
    )}
    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <span
        className="truncate"
        style={{
          fontFamily: 'var(--font-ui)',
          fontWeight: selected ? 700 : 500,
          fontSize: compact ? 13.5 : 15.5,
          color: selected ? 'var(--signal)' : 'var(--fg)',
        }}
      >
        {crew === null ? COPY.lens.pickerNone : crew.name}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:
            crew !== null && crew.upcomingCount > 0
              ? 'var(--signal)'
              : 'var(--fg-subtle)',
        }}
      >
        {crew === null
          ? COPY.lens.pickerNoneMeta
          : COPY.list.upcomingMeta(crew.upcomingCount)}
      </span>
    </span>
    {selected && <PickerCheck />}
  </button>
)

interface CrewPickerBodyProps {
  crews: CrewSummary[]
  selectedId: string | null
  compact: boolean
  onSelect: (crewId: string | null) => void
}

const CrewPickerBody = ({
  crews,
  selectedId,
  compact,
  onSelect,
}: CrewPickerBodyProps) => (
  <div className="flex flex-col">
    <CrewPickerRow
      crew={null}
      selected={selectedId === null}
      compact={compact}
      onSelect={() => onSelect(null)}
    />
    {crews.map((crew) => (
      <CrewPickerRow
        key={crew.id}
        crew={crew}
        selected={crew.id === selectedId}
        compact={compact}
        onSelect={() => onSelect(crew.id)}
      />
    ))}
  </div>
)

interface CrewLensPillProps {
  crews: CrewSummary[]
  activeCrew: CrewSummary | null
  onSelect: (crewId: string | null) => void
  wide: boolean
}

/**
 * The one control: a 32px pill beside the List/Cal toggle. Resting it costs a
 * word in a row that already had spare width; on, it carries the crew's own
 * patch so the pill and the page title agree at a glance.
 *
 * The picker is built to the shipped filter sheet's anatomy but deliberately
 * not to its API: `FILTER_DEFS` options are `{ value, label }` pairs describing
 * an attribute of a show, and feeding a crew through them would make the lens
 * a filter dimension, which is the exact thing this design argues against.
 */
export const CrewLensPill = ({
  crews,
  activeCrew,
  onSelect,
  wide,
}: CrewLensPillProps) => {
  const isMobile = useIsMobileViewport()
  const trigger = useOverlayTrigger({ isMobile })
  const panelId = useId()
  const on = activeCrew !== null

  // Selecting applies immediately and dismisses, like every shipped sheet.
  const pick = (crewId: string | null) => {
    trigger.close()
    onSelect(crewId)
  }

  const body = (
    <CrewPickerBody
      crews={crews}
      selectedId={activeCrew?.id ?? null}
      compact={!isMobile}
      onSelect={pick}
    />
  )

  return (
    <span className="relative inline-flex">
      <button
        ref={trigger.triggerRef}
        type="button"
        onClick={trigger.toggle}
        aria-pressed={on}
        aria-expanded={trigger.open}
        aria-haspopup="dialog"
        aria-controls={trigger.open ? panelId : undefined}
        aria-label={on ? COPY.a11y.lensOn(activeCrew.name) : undefined}
        className="inline-flex cursor-pointer items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          height: 32,
          minHeight: 32,
          maxWidth: wide ? 200 : 126,
          padding: on ? '0 8px 0 4px' : '0 9px 0 8px',
          borderRadius: 8,
          outlineColor: 'var(--focus)',
          background: on
            ? 'color-mix(in oklch, var(--signal) 16%, transparent)'
            : 'transparent',
          border: `1px solid ${on ? 'var(--signal)' : 'var(--border-strong)'}`,
          color: on ? 'var(--signal)' : 'var(--fg-muted)',
          fontFamily: 'var(--font-ui)',
          fontWeight: 700,
          fontSize: 11.5,
          letterSpacing: '-0.005em',
        }}
      >
        {on ? (
          <CrewPatch
            crewId={activeCrew.id}
            patchSalt={activeCrew.patchSalt}
            size={22}
            scale="micro"
          />
        ) : (
          <LensGlyph size={13} />
        )}
        <span className="min-w-0 truncate">
          {on ? activeCrew.name : COPY.lens.resting}
        </span>
        <Chevron />
      </button>
      {trigger.open &&
        (isMobile ? (
          <CCOverlayHost>
            <CCOverlay
              id={panelId}
              mode="sheet"
              title={COPY.lens.railEyebrow}
              onClose={trigger.close}
            >
              <div className="flex flex-col gap-[3px] pb-2.5">
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: '-0.02em',
                    color: 'var(--fg)',
                  }}
                >
                  {COPY.lens.pickerTitle}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12.5,
                    color: 'var(--fg-muted)',
                  }}
                >
                  {COPY.lens.pickerSub}
                </span>
              </div>
              {body}
            </CCOverlay>
          </CCOverlayHost>
        ) : (
          <CCOverlay
            id={panelId}
            mode="popover"
            title={COPY.lens.railEyebrow}
            anchor={trigger.triggerNode}
            placement="bottom"
            align="end"
            width={320}
            onClose={trigger.close}
          >
            <div
              className="pb-1.5"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 11.5,
                color: 'var(--fg-muted)',
              }}
            >
              {COPY.lens.pickerSub}
            </div>
            {body}
          </CCOverlay>
        ))}
    </span>
  )
}

interface CrewLensRailProps {
  /** Null when the lens feed failed to load, where "0 shows" would be a lie. */
  count: number | null
  onClear: () => void
}

/**
 * Replaces the location eyebrow while a lens is on. The weight of the state
 * lands here and on the page title, never on the chips, and it carries its own
 * dismissal so the lens is always one tap from off.
 */
export const CrewLensRail = ({ count, onClear }: CrewLensRailProps) => (
  <div className="flex items-center gap-[9px]" style={{ minHeight: 22 }}>
    <span
      aria-hidden="true"
      className="shrink-0"
      style={{
        width: 6,
        height: 6,
        borderRadius: 6,
        background: 'var(--signal)',
        boxShadow: '0 0 8px var(--signal)',
      }}
    />
    <span
      className="whitespace-nowrap"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color: 'var(--signal)',
      }}
    >
      {COPY.lens.railEyebrow} ·{' '}
      {count === null ? COPY.lens.failedRail : COPY.lens.railCount(count)}
    </span>
    <span
      aria-hidden="true"
      className="h-px flex-1"
      style={{ background: 'var(--border)', minWidth: 8 }}
    />
    <button
      type="button"
      onClick={onClear}
      aria-label={COPY.a11y.lensOff}
      className="shrink-0 cursor-pointer whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        minHeight: 22,
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
        borderBottom: '1px solid var(--border-strong)',
        lineHeight: 1.5,
        outlineColor: 'var(--focus)',
      }}
    >
      {COPY.glyphs.clear} {COPY.lens.railClear}
    </button>
  </div>
)
