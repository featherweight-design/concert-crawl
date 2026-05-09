'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import type { WatchingShow } from '@concert-crawl/types'
import { cn } from '@/lib/utils'
import { CCMark } from '../cc-mark'
import { UserAvatar } from '../app-header/UserAvatar'
import { WatchingItem } from './WatchingItem'
import { WatchingEmpty } from './WatchingEmpty'
import { NotifyFutureRow } from './NotifyFutureRow'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const DESKTOP_TABS = [
  { label: 'Browse', href: '/events' },
  { label: 'Search', href: '/search' },
  { label: 'Watching', href: '/watching' },
] as const

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

interface WatchingRouteDesktopProps {
  initialShows: WatchingShow[]
}

export function WatchingRouteDesktop({
  initialShows,
}: WatchingRouteDesktopProps) {
  const [shows, setShows] = useState<WatchingShow[]>(initialShows)
  const { getToken } = useAuth()
  const pathname = usePathname()

  const handleRemove = useCallback(
    async (userEventId: string) => {
      const show = shows.find((sv) => sv.userEventId === userEventId)
      if (!show) return

      setShows((prev) => prev.filter((sv) => sv.userEventId !== userEventId))

      const revert = () => {
        setShows((prev) =>
          [...prev, show].sort((sa, sb) => {
            if (sa.date !== sb.date) return sa.date < sb.date ? -1 : 1
            if (!sa.showTime) return 1
            if (!sb.showTime) return -1
            return sa.showTime < sb.showTime ? -1 : 1
          }),
        )
      }

      try {
        const token = await getToken()
        if (!token) {
          revert()
          return
        }
        await fetch(`${API_URL}/v1/watching/${show.eventId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        revert()
      }
    },
    [shows, getToken],
  )

  const { drops, spikes, soldOut } = countChanges(shows)
  const groups = groupShows(shows)

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
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}
    >
      {/* TopNav */}
      <div
        style={{
          flexShrink: 0,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Left: logo + tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link
            href="/events"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <CCMark size={28} />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--fg)',
              }}
            >
              concert<span style={{ color: 'var(--accent)' }}>crawl.</span>
            </span>
          </Link>

          <nav style={{ display: 'flex', gap: 4 }}>
            {DESKTOP_TABS.map((tab) => {
              const isActive = pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'shrink-0 rounded-lg px-[14px] py-[8px] text-[13px] tracking-[-0.01em]',
                    isActive
                      ? 'bg-surface-2 font-bold text-fg'
                      : 'bg-transparent font-medium text-fg-muted transition-colors hover:bg-surface-1 hover:text-fg',
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: avatar */}
        <UserAvatar />
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          padding: '32px 32px 80px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 880 }}>
          {/* Headline block */}
          <div
            style={{
              paddingBottom: 18,
              borderBottom: '1px solid var(--border)',
              marginBottom: 24,
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <p
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: 36,
                  fontWeight: 900,
                  letterSpacing: '-0.025em',
                  color: 'var(--fg)',
                  margin: 0,
                  lineHeight: 1,
                }}
              >
                {shows.length} show{shows.length !== 1 ? 's' : ''}
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
          </div>

          {/* Section list */}
          {shows.length === 0 ? (
            <WatchingEmpty />
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {groups.map((group) => (
                <section key={group.key}>
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
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
