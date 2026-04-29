'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import type { VenuePublic } from '@concert-crawl/types'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface FilterBarProps {
  venues: VenuePublic[]
  className?: string
}

export function FilterBar({ venues, className }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('offset') // reset pagination on filter change
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    },
    [router, pathname, searchParams],
  )

  const search = searchParams.get('search') ?? ''
  const venueSlug = searchParams.get('venueSlug') ?? ''
  const from = searchParams.get('from') ?? ''
  const hasFilters = search || venueSlug || from

  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3',
        isPending && 'opacity-70 pointer-events-none',
        className,
      )}
    >
      {/* Search */}
      <Input
        type="search"
        placeholder="Artist or show name…"
        defaultValue={search}
        onChange={(evt) => updateParam('search', evt.target.value)}
        className="sm:max-w-xs"
        aria-label="Search artists and shows"
      />

      {/* Venue filter */}
      <select
        value={venueSlug}
        onChange={(evt) => updateParam('venueSlug', evt.target.value)}
        className="h-8 rounded-lg border border-border bg-bg px-2.5 text-sm text-fg outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/30 sm:max-w-[200px]"
        aria-label="Filter by venue"
      >
        <option value="">All venues</option>
        {venues.map((venue) => (
          <option key={venue.id} value={venue.slug}>
            {venue.name}
          </option>
        ))}
      </select>

      {/* Date filter */}
      <input
        type="date"
        value={from}
        onChange={(evt) => updateParam('from', evt.target.value)}
        className="h-8 rounded-lg border border-border bg-bg px-2.5 text-sm text-fg outline-none focus:border-border-focus focus:ring-2 focus:ring-border-focus/30"
        aria-label="Filter by date"
      />

      {/* Clear filters */}
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              router.replace(pathname, { scroll: false })
            })
          }}
          className="text-sm text-fg-subtle hover:text-fg underline-offset-4 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
