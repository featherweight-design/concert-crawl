'use client'

import { GUIDE_CHIP_ORDER, type GuideChipKey } from '@concert-crawl/types'
import { ADMIN_COPY } from '../definitions/copy'
import { GuideIcon } from './GuideIcon'

const GUIDE_COPY = ADMIN_COPY.venueDetailsClient.guide

// Accessibility is pinned and never appears in the picker — it is always
// authored, so there is nothing to add or remove.
const OPTIONAL_KEYS = GUIDE_CHIP_ORDER.filter((key) => key !== 'accessibility')

// #997 pool preview, ghosted so the finite-but-growing model is legible.
const V2_KEYS = ['weather', 'restrooms', 'atm', 'cell_service'] as const

interface ChipPickerProps {
  selected: GuideChipKey[]
  onToggle: (key: GuideChipKey) => void
  disabled?: boolean
}

export const ChipPicker = ({
  selected,
  onToggle,
  disabled = false,
}: ChipPickerProps) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
    {OPTIONAL_KEYS.map((key) => {
      const on = selected.includes(key)
      const label = GUIDE_COPY.chipLabel[key]
      return (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          disabled={disabled}
          aria-pressed={on}
          aria-label={`${on ? GUIDE_COPY.picker.removeLabel : GUIDE_COPY.picker.addLabel} ${label}`}
          style={{
            // `all: unset` also drops the UA disabled styling, so the
            // inert state has to be drawn explicitly.
            all: 'unset',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            // 44px floor — the handoff drew 32px (design-table §C.1).
            minHeight: 44,
            padding: '0 13px',
            borderRadius: 999,
            boxSizing: 'border-box',
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            background: on
              ? 'color-mix(in oklab, var(--signal) 14%, transparent)'
              : 'var(--surface-1)',
            color: on ? 'var(--signal)' : 'var(--fg-muted)',
            border: `1px solid ${
              on
                ? 'color-mix(in oklab, var(--signal) 40%, transparent)'
                : 'var(--border-strong)'
            }`,
          }}
        >
          <GuideIcon name={key} size={13} />
          {label}
          <span
            aria-hidden="true"
            style={{ fontSize: 13, fontWeight: 700, opacity: 0.8 }}
          >
            {on ? '−' : '+'}
          </span>
        </button>
      )
    })}

    {V2_KEYS.map((key) => (
      <span
        key={key}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          minHeight: 44,
          padding: '0 13px',
          borderRadius: 999,
          boxSizing: 'border-box',
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--fg-subtle)',
          border: '1px dashed var(--border)',
          opacity: 0.6,
        }}
      >
        {GUIDE_COPY.v2Chip[key]}
      </span>
    ))}

    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: 'var(--fg-subtle)',
        padding: '0 4px',
      }}
    >
      {GUIDE_COPY.picker.soonMarker}
    </span>

    {/* Explains the ghosts in text rather than a native title= tooltip. */}
    <span
      style={{
        flexBasis: '100%',
        fontFamily: 'var(--font-sans)',
        fontSize: 11.5,
        lineHeight: 1.45,
        color: 'var(--fg-subtle)',
      }}
    >
      {GUIDE_COPY.picker.soonHint}
    </span>
  </div>
)
