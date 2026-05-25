'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import type { VenuePublic } from '@concert-crawl/types'
import { cn } from '@/lib/utils'
import { FilterPopover } from './FilterPopover'
import { FilterSheet } from './FilterSheet'
import {
  FILTER_DEFS,
  FILTER_ORDER,
  type FilterKey,
  getActiveFilterCount,
  getActiveFilterLabel,
  getFilterOptions,
} from './filter-defs'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY.filterBar

interface FilterBarProps {
  venues: VenuePublic[]
  genres?: string[]
  className?: string
}

function IconList({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4h10M3 8h10M3 12h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconCal({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect
        x="2"
        y="3.25"
        width="12"
        height="10.75"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
      <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 1.75v2.5M10.5 1.75v2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconChevDown({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

export function FilterBar({ venues, genres = [], className }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      params.delete('offset')
      startTransition(() => {
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        })
      })
    },
    [pathname, router, searchParams],
  )

  const [openFilterKey, setOpenFilterKey] = useState<FilterKey | null>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const chipRefs = useRef<Record<FilterKey, HTMLButtonElement | null>>({
    when: null,
    where: null,
    price: null,
    vibe: null,
  })

  const filterValues: Partial<Record<FilterKey, string>> = {
    when: searchParams.get('filterWhen') ?? '',
    where: searchParams.get('filterWhere') ?? '',
    price: searchParams.get('filterPrice') ?? '',
    vibe: searchParams.get('filterVibe') ?? '',
  }

  const isCalendarView = (searchParams.get('view') ?? 'list') === 'cal'
  const activeFilterCount = getActiveFilterCount(filterValues)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 640px)')
    const apply = () => setIsDesktop(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (!openFilterKey || !isDesktop) return
    const nextAnchor = chipRefs.current[openFilterKey]
    setAnchorRect(nextAnchor?.getBoundingClientRect() ?? null)
  }, [openFilterKey, isDesktop])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenFilterKey(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const activeDef = openFilterKey ? FILTER_DEFS[openFilterKey] : null
  const activeOptions = openFilterKey
    ? getFilterOptions(openFilterKey, venues, genres)
    : []
  const activeValue = openFilterKey ? (filterValues[openFilterKey] ?? '') : ''

  const setFilterValue = useCallback(
    (key: FilterKey, value: string) => {
      updateParams({ [FILTER_DEFS[key].queryKey]: value })
    },
    [updateParams],
  )

  const clearAllFilters = useCallback(() => {
    updateParams({
      [FILTER_DEFS.when.queryKey]: '',
      [FILTER_DEFS.where.queryKey]: '',
      [FILTER_DEFS.price.queryKey]: '',
      [FILTER_DEFS.vibe.queryKey]: '',
      from: '',
      to: '',
    })
    setOpenFilterKey(null)
  }, [updateParams])

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3',
        isPending && 'opacity-70 pointer-events-none',
        className,
      )}
    >
      {/* Heading row: title left, List/Cal toggle right */}
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[10px] uppercase tracking-widest text-fg-muted"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
          >
            {copy.locationLine}
          </span>
          <h1
            className="text-[28px] font-black leading-none tracking-tight text-fg"
            style={{ letterSpacing: '-0.03em' }}
          >
            {copy.headingTitle}
          </h1>
        </div>

        {/* List / Cal toggle — Inter font, SVG icons (icons hidden on mobile) */}
        <div
          className="inline-flex items-center"
          style={{
            padding: 3,
            borderRadius: 8,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
          }}
        >
          {(
            [
              { key: 'list', label: copy.viewList, Icon: IconList },
              { key: 'cal', label: copy.viewCal, Icon: IconCal },
            ] as const
          ).map(({ key, label, Icon }) => {
            const active = isCalendarView ? key === 'cal' : key === 'list'
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  // When switching views, strip view-specific params so the
                  // server component re-fetches with a clean slate.
                  if (key === 'list') {
                    updateParams({
                      view: 'list',
                      selectedDate: '',
                      weekOffset: '',
                    })
                  } else {
                    // Switching to cal view: clear filterWhen so the hidden chip
                    // doesn't silently apply server-side date filtering.
                    updateParams({
                      view: key,
                      [FILTER_DEFS.when.queryKey]: '',
                    })
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 transition-colors"
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '-0.005em',
                  color: active ? 'var(--fg-on-accent)' : 'var(--fg-muted)',
                  background: active ? 'var(--signal)' : 'transparent',
                }}
                aria-pressed={active}
              >
                <span className="hidden sm:inline-flex">
                  <Icon size={13} />
                </span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter chips — Inter font, surface-1 inactive bg, placeholder as default label */}
      <div
        className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-none"
        style={{
          maskImage: 'linear-gradient(to right, black 85%, transparent)',
        }}
      >
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-border-strong sm:hidden"
            style={{ color: 'var(--fg-muted)' }}
            aria-label={copy.clearAllFiltersAriaLabel}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        )}

        {FILTER_ORDER.map((key) => {
          if (key === 'when' && isCalendarView) return null

          const value = filterValues[key] ?? ''
          const activeLabel = value
            ? getActiveFilterLabel(key, value, venues, genres)
            : null
          const displayLabel = activeLabel ?? FILTER_DEFS[key].placeholder
          const isActive = Boolean(value)
          const isOpen = openFilterKey === key

          return (
            <button
              key={key}
              type="button"
              ref={(element) => {
                chipRefs.current[key] = element
              }}
              onClick={(event) => {
                const nextOpen = isOpen ? null : key
                setOpenFilterKey(nextOpen)
                if (nextOpen) {
                  setAnchorRect(event.currentTarget.getBoundingClientRect())
                }
              }}
              data-testid={key === 'where' ? 'venue-chip' : undefined}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3"
              style={{
                fontFamily: 'Inter, system-ui',
                fontWeight: 600,
                fontSize: 12.5,
                letterSpacing: '-0.005em',
                color: isActive ? 'var(--fg-on-accent)' : 'var(--fg)',
                borderColor: isActive ? 'var(--signal)' : 'var(--border)',
                background: isActive ? 'var(--signal)' : 'var(--surface-1)',
              }}
              aria-expanded={isOpen}
              aria-haspopup="dialog"
            >
              <span style={{ whiteSpace: 'nowrap' }}>{displayLabel}</span>
              <IconChevDown size={11} />
            </button>
          )
        })}

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="hidden h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full border border-dashed border-border-strong px-3 sm:inline-flex"
            style={{
              fontFamily: 'Inter, system-ui',
              fontWeight: 600,
              fontSize: 12.5,
              color: 'var(--fg-muted)',
            }}
          >
            {copy.clearFiltersButton}
          </button>
        )}
      </div>

      {activeDef && openFilterKey && (
        <FilterSheet
          open={!isDesktop}
          title={activeDef.label}
          placeholder={activeDef.placeholder}
          options={activeOptions}
          value={activeValue}
          onClose={() => setOpenFilterKey(null)}
          onSelect={(nextValue) => setFilterValue(openFilterKey, nextValue)}
        />
      )}

      {activeDef && openFilterKey && (
        <FilterPopover
          open={isDesktop}
          title={activeDef.label}
          placeholder={activeDef.placeholder}
          options={activeOptions}
          value={activeValue}
          anchorRect={anchorRect}
          onClose={() => setOpenFilterKey(null)}
          onSelect={(nextValue) => setFilterValue(openFilterKey, nextValue)}
        />
      )}

      {(searchParams.get('search') || searchParams.get('venueSlug')) && (
        <button
          type="button"
          onClick={() => {
            updateParams({ search: '', venueSlug: '', from: '' })
          }}
          className="text-sm text-fg-subtle hover:text-fg underline-offset-4 hover:underline"
        >
          {copy.clearSearchButton}
        </button>
      )}
    </div>
  )
}
