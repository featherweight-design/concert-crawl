'use client'

import { useRef, useState } from 'react'
import { FilterPopover } from '../filter-bar/FilterPopover'
import { FilterSheet } from '../filter-bar/FilterSheet'
import {
  VENUE_FILTER_DEFS,
  VENUE_FILTER_ORDER,
  venueChipLabel,
  type VenueFilterKey,
  type VenueFilterState,
} from './venue-filter-defs'
import { cn } from '@/lib/utils'

interface VenueFilterBarProps {
  state: VenueFilterState
  onChange: (next: VenueFilterState) => void
}

function IconChevDown() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function VenueFilterBar({ state, onChange }: VenueFilterBarProps) {
  const [openKey, setOpenKey] = useState<VenueFilterKey | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const chipRefs = useRef<
    Partial<Record<VenueFilterKey, HTMLButtonElement | null>>
  >({})

  const clearable = VENUE_FILTER_ORDER.filter(
    (key) => !VENUE_FILTER_DEFS[key].alwaysOn,
  )
  const anyActive = clearable.some((key) => state[key])

  function openFilter(key: VenueFilterKey) {
    const rect = chipRefs.current[key]?.getBoundingClientRect() ?? null
    setAnchorRect(rect)
    setOpenKey(key)
  }

  function handleSelect(value: string) {
    if (!openKey) return
    const def = VENUE_FILTER_DEFS[openKey]
    const current = state[openKey]
    const next = !def.alwaysOn && current === value ? null : value
    onChange({ ...state, [openKey]: next })
    setOpenKey(null)
  }

  function clearFilters() {
    onChange({ ...state, capacity: null, distance: null })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {VENUE_FILTER_ORDER.map((key) => {
        const def = VENUE_FILTER_DEFS[key]
        const value = state[key]
        const active = def.alwaysOn
          ? !!value && value !== def.options[0]?.value
          : !!value
        const label = venueChipLabel(key, value)

        return (
          <button
            key={key}
            ref={(el) => {
              chipRefs.current[key] = el
            }}
            type="button"
            onClick={() => openFilter(key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[12.5px] font-semibold transition-colors',
              active
                ? 'border border-signal bg-signal text-fg-on-accent'
                : 'border border-border bg-surface-1 text-fg hover:bg-surface-2',
            )}
          >
            {def.alwaysOn && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  opacity: active ? 0.7 : 1,
                  color: active ? 'var(--fg-on-accent)' : 'var(--fg-subtle)',
                }}
              >
                Sort
              </span>
            )}
            <span className="whitespace-nowrap">{label}</span>
            <IconChevDown />
          </button>
        )
      })}

      {anyActive && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-border-strong px-3 py-[7px] text-[12.5px] font-semibold text-fg-muted transition-colors hover:text-fg"
        >
          × Clear filters
        </button>
      )}

      {/* Desktop popover */}
      {openKey && (
        <FilterPopover
          open={!!openKey}
          title={VENUE_FILTER_DEFS[openKey]?.label ?? ''}
          placeholder={VENUE_FILTER_DEFS[openKey]?.placeholder ?? ''}
          options={VENUE_FILTER_DEFS[openKey]?.options ?? []}
          value={state[openKey] ?? ''}
          anchorRect={anchorRect}
          onSelect={handleSelect}
          onClose={() => setOpenKey(null)}
        />
      )}

      {/* Mobile bottom sheet */}
      {openKey && (
        <FilterSheet
          open={!!openKey}
          title={VENUE_FILTER_DEFS[openKey]?.label ?? ''}
          placeholder={VENUE_FILTER_DEFS[openKey]?.placeholder ?? ''}
          options={VENUE_FILTER_DEFS[openKey]?.options ?? []}
          value={state[openKey] ?? ''}
          onSelect={handleSelect}
          onClose={() => setOpenKey(null)}
        />
      )}
    </div>
  )
}
