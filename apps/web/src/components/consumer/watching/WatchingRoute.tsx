'use client'

import { useState, useCallback } from 'react'
import type { WatchingShow } from '@concert-crawl/types'
import { useWatching } from '@/lib/queries/use-watching'
import { useWatchToggle } from '@/lib/queries/use-watch-toggle'
import { WatchingItem } from './WatchingItem'
import { WatchingEmpty } from './WatchingEmpty'
import { NotifyFutureRow } from './NotifyFutureRow'

interface WatchingRouteProps {
  initialShows: WatchingShow[]
}

function countChanges(shows: WatchingShow[]): {
  drops: number
  spikes: number
  soldOut: number
} {
  let drops = 0
  let spikes = 0
  let soldOut = 0
  for (const show of shows) {
    if (show.watchStatus === 'soldout') {
      soldOut++
    } else if (
      show.savedPrice !== null &&
      show.currentPrice !== null &&
      show.currentPrice - show.savedPrice <= -2
    ) {
      drops++
    } else if (
      show.savedPrice !== null &&
      show.currentPrice !== null &&
      show.currentPrice - show.savedPrice >= 2
    ) {
      spikes++
    }
  }
  return { drops, spikes, soldOut }
}

type DateBucket =
  | 'tonight'
  | 'thisWeek'
  | 'nextWeek'
  | { month: string; year: number }

function classifyDate(dateStr: string): DateBucket {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const showDate = new Date(`${dateStr}T00:00:00`)
  showDate.setHours(0, 0, 0, 0)
  const daysUntil = Math.round(
    (showDate.getTime() - today.getTime()) / 86400000,
  )
  if (daysUntil === 0) return 'tonight'
  if (daysUntil < 7) return 'thisWeek'
  if (daysUntil < 14) return 'nextWeek'
  const date = new Date(`${dateStr}T00:00:00`)
  return {
    month: date.toLocaleDateString('en-US', { month: 'long' }),
    year: date.getFullYear(),
  }
}

function bucketKey(bucket: DateBucket): string {
  if (bucket === 'tonight') return 'tonight'
  if (bucket === 'thisWeek') return 'thisWeek'
  if (bucket === 'nextWeek') return 'nextWeek'
  return `${bucket.month}-${bucket.year}`
}

function bucketLabel(bucket: DateBucket): string {
  if (bucket === 'tonight') return 'Tonight'
  if (bucket === 'thisWeek') return 'This week'
  if (bucket === 'nextWeek') return 'Next week'
  return bucket.month
}

interface GroupedShows {
  bucket: DateBucket
  key: string
  label: string
  shows: WatchingShow[]
}

function groupShows(shows: WatchingShow[]): GroupedShows[] {
  const bucketMap = new Map<string, GroupedShows>()
  const bucketOrder: string[] = []

  for (const show of shows) {
    const bucket = classifyDate(show.date)
    const key = bucketKey(bucket)
    if (!bucketMap.has(key)) {
      bucketMap.set(key, { bucket, key, label: bucketLabel(bucket), shows: [] })
      bucketOrder.push(key)
    }
    bucketMap.get(key)!.shows.push(show)
  }

  return bucketOrder.map((key) => bucketMap.get(key)!)
}

export function WatchingRoute({ initialShows }: WatchingRouteProps) {
  const { data: cachedShows } = useWatching({ initialData: initialShows })
  const toggle = useWatchToggle()
  const shows = cachedShows ?? initialShows

  const [pendingRemoveIds, setPendingRemoveIds] = useState<Set<string>>(
    new Set(),
  )
  const displayedShows = shows.filter((sv) => !pendingRemoveIds.has(sv.eventId))

  const handleRemove = useCallback(
    (userEventId: string) => {
      const show = shows.find((sv) => sv.userEventId === userEventId)
      if (!show || toggle.isPending) return
      setPendingRemoveIds((prev) => new Set([...prev, show.eventId]))
      toggle.mutate(show.eventId, {
        onSettled: () => {
          setPendingRemoveIds((prev) => {
            const next = new Set(prev)
            next.delete(show.eventId)
            return next
          })
        },
      })
    },
    [shows, toggle],
  )

  const { drops, spikes, soldOut } = countChanges(displayedShows)
  const groups = groupShows(displayedShows)

  const changeSummary = () => {
    const parts: string[] = []
    if (drops > 0) parts.push(`${drops} dropped`)
    if (spikes > 0) parts.push(`${spikes} went up`)
    if (soldOut > 0) parts.push(`${soldOut} sold out`)
    if (parts.length === 0) return 'prices held'
    return parts.join(' · ')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: 'var(--bg)',
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          flexShrink: 0,
          padding: '16px 16px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
            margin: '0 0 4px',
          }}
        >
          WATCHING
        </p>
        <p
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: '-0.025em',
            color: 'var(--fg)',
            margin: '0 0 4px',
            lineHeight: 1,
          }}
        >
          {displayedShows.length} show{displayedShows.length !== 1 ? 's' : ''}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 600,
            color: drops > 0 ? 'var(--success)' : 'var(--fg-muted)',
            margin: 0,
          }}
        >
          {changeSummary()}
        </p>
      </div>

      {/* Scroll region */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px 100px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {displayedShows.length === 0 ? (
          <WatchingEmpty />
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.key}>
                {/* Section header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    padding: '10px 4px 4px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color:
                        group.key === 'tonight'
                          ? 'var(--accent)'
                          : 'var(--fg-subtle)',
                    }}
                  >
                    {group.label}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 500,
                      color: 'var(--fg-subtle)',
                    }}
                  >
                    · {group.shows.length}
                  </span>
                </div>

                {/* Rows */}
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
                >
                  {group.shows.map((show) => (
                    <WatchingItem
                      key={show.userEventId}
                      show={show}
                      density="cozy"
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </section>
            ))}
            <NotifyFutureRow />
          </>
        )}
      </div>
    </div>
  )
}
