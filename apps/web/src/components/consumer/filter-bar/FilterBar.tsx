'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import type { CrewSummary, VenuePublic } from '@concert-crawl/types'
import { CrewLensPill, CrewLensRail } from '@/components/consumer/crews'
import { cn } from '@/lib/utils'
import { useFeatureFlag } from '@/lib/queries/use-feature-flags'
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
import { TasteFilterChip } from './TasteFilterChip'
import { FollowFilterChip } from './FollowFilterChip'

const copy = CONSUMER_COPY.filterBar

interface FilterBarProps {
  venues: VenuePublic[]
  genres?: string[]
  className?: string
  // Server-resolved SCA-region boolean for the taste chip's tier-picker
  // handoff (#763 PR 7). Defaults true (fail-safe): isScaRegion treats an
  // unknown country as SCA, so unresolved mounts must show the notice too.
  scaRegion?: boolean
  /**
   * The viewer's crews, for the Browse lens (#1226). Empty or absent hides the
   * lens pill entirely: a control that can only ever open an empty picker is
   * worse than no control.
   */
  crews?: CrewSummary[]
  /** Shows in the active lens, for the rail's count. Null when it failed. */
  lensCount?: number | null
  /**
   * Follows the server counted, for the "My artists" chip (native following,
   * PR 4). `null` means UNKNOWN — the seed failed, or there was no session to
   * read it with — and the chip keeps rendering rather than vanishing on a
   * viewer who follows fifty artists. `0` is a claim; `null` is an admission.
   */
  followCount?: number | null
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

export function FilterBar({
  venues,
  genres = [],
  className,
  scaRegion = true,
  crews: crewsProp = [],
  lensCount = null,
  followCount = null,
}: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  // Gated at the source rather than at each render site: `lensCrew` is
  // resolved out of this list, so emptying it drops the pill, the rail and the
  // crew name in the heading together. Gating the two render sites alone would
  // still print the crew's name in the <h1> for anyone holding a `?crew=` URL.
  const { enabled: crewsEnabled } = useFeatureFlag('crews')
  const crews = crewsEnabled ? crewsProp : []

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
  // Taste scope (#763 PR 7) — a mode, not a dimension: excluded from the
  // active-filter count / Clear all (it has its own ✕ on the chip).
  const tasteActive = searchParams.get('filterTaste') === '1'
  // Same treatment for the follow scope: a mode, not a dimension.
  const followActive = searchParams.get('filterFollowing') === '1'

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

  // The lens rides a search param like every other Browse state, so it
  // survives a refresh and a shared URL. An id with no matching crew (a stale
  // link, a crew since left) resolves to null and the page reads as resting.
  const lensCrewId = searchParams.get('crew')
  const lensCrew = crews.find((crew) => crew.id === lensCrewId) ?? null

  const setLensCrew = useCallback(
    (crewId: string | null) => {
      updateParams({ crew: crewId ?? '' })
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
      {/* Heading row: title left, lens pill + List/Cal toggle right */}
      <div className="flex items-end justify-between gap-2.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* The lens takes the eyebrow's slot rather than sitting beside it:
              "DENVER, CO" and "CREW LENS · 4 SHOWS" are both answers to what
              you're looking at, and two of them read as neither. */}
          {lensCrew === null && (
            <span
              className="text-[10px] uppercase tracking-widest text-fg-muted"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
            >
              {copy.locationLine}
            </span>
          )}
          <h1
            className="truncate text-[28px] font-black leading-none tracking-tight text-fg"
            style={{ letterSpacing: '-0.03em' }}
          >
            {lensCrew === null ? copy.headingTitle : lensCrew.name}
          </h1>
        </div>

        {crews.length > 0 && (
          <div className="flex shrink-0 items-center">
            <CrewLensPill
              crews={crews}
              activeCrew={lensCrew}
              onSelect={setLensCrew}
              wide={isDesktop}
            />
          </div>
        )}

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

      {lensCrew !== null && (
        <CrewLensRail
          count={lensCount}
          onClear={() => {
            setLensCrew(null)
          }}
        />
      )}

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

        {/* Scope chips lead the row (taste-filter.jsx: they're modes, so they
            sit before the dimension chips, each split off by its own trailing
            divider). "My artists" comes first: it scopes to a list the viewer
            built by hand, where the taste chip scopes to one Spotify inferred.
            Either chip can render nothing, and because each owns the divider
            that FOLLOWS it, no combination can strand a leading rule. */}
        <FollowFilterChip
          active={followActive}
          onToggle={(next) =>
            updateParams({ filterFollowing: next ? '1' : '' })
          }
          followCount={followCount}
          scaRegion={scaRegion}
        />

        <TasteFilterChip
          active={tasteActive}
          onToggle={(next) => updateParams({ filterTaste: next ? '1' : '' })}
          scaRegion={scaRegion}
        />

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
