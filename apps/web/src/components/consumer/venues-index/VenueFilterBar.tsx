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
import { VENUES_INDEX_COPY } from './definitions/copy'

interface VenueFilterBarProps {
  state: VenueFilterState
  onChange: (next: VenueFilterState) => void
}

function IconChevDown({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path
        d="M3 4.5l3 3 3-3"
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
    <>
      {/* Mobile: horizontally scrollable chip strip */}
      <div
        className="flex sm:hidden items-center gap-1.5 overflow-x-auto"
        style={{ padding: '8px 16px 14px', scrollbarWidth: 'none' }}
      >
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
              type="button"
              onClick={() => openFilter(key)}
              style={{ letterSpacing: '-0.005em' }}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors',
                active
                  ? 'border-signal bg-signal text-fg-on-accent'
                  : 'border-border-strong bg-transparent text-fg-muted',
              )}
            >
              {def.alwaysOn && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    opacity: active ? 0.7 : 1,
                    color: active ? 'var(--fg-on-accent)' : 'var(--fg-subtle)',
                  }}
                >
                  {VENUES_INDEX_COPY.filterBar.sortPrefix}
                </span>
              )}
              <span className="whitespace-nowrap">{label}</span>
              <IconChevDown size={9} />
            </button>
          )
        })}

        {anyActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-border-strong bg-transparent px-3 py-1.5 text-[12px] font-semibold text-fg-subtle transition-colors hover:text-fg"
          >
            {VENUES_INDEX_COPY.filterBar.clearMobile}
          </button>
        )}
      </div>

      {/* Desktop: wrapping chip row */}
      <div className="hidden sm:flex flex-wrap items-center gap-2">
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
              style={{ letterSpacing: '-0.005em' }}
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
                  {VENUES_INDEX_COPY.filterBar.sortPrefix}
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
            {VENUES_INDEX_COPY.filterBar.clearDesktop}
          </button>
        )}
      </div>

      {/* Desktop popover — only render when anchorRect is set (desktop only) */}
      {openKey && anchorRect && (
        <FilterPopover
          open={!!openKey}
          title={VENUE_FILTER_DEFS[openKey]?.label ?? ''}
          placeholder={VENUE_FILTER_DEFS[openKey]?.placeholder ?? ''}
          options={VENUE_FILTER_DEFS[openKey]?.options ?? []}
          value={state[openKey] ?? ''}
          anchorRect={anchorRect}
          alwaysOn={VENUE_FILTER_DEFS[openKey]?.alwaysOn ?? false}
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
          alwaysOn={VENUE_FILTER_DEFS[openKey]?.alwaysOn ?? false}
          onSelect={handleSelect}
          onClose={() => setOpenKey(null)}
        />
      )}
    </>
  )
}
