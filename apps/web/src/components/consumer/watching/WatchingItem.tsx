'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { WatchingShow } from '@concert-crawl/types'
import { EventImage } from '../event-image'
import { DeltaTag } from './DeltaTag'
import { SourcePill } from './SourcePill'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'
import { GoingNudge } from '@/components/consumer/going/GoingNudge'
import { isInNudgeWindow } from '@/lib/going/nudge-window'
import { markNudge, readNudgeState } from '@/lib/going/nudge-dismissal'
import type { NudgeOutcome } from '@/lib/going/nudge-dismissal'
import { useAttendingToggle } from '@/lib/queries/use-attending-toggle'
import { isOptimisticWatchRow } from '@/lib/queries/optimistic-watch-row'

const COPY = CONSUMER_COPY.watching

type Density = 'compact' | 'cozy' | 'roomy'

const DENSITY_CONFIG: Record<
  Density,
  {
    artSize: number
    padY: number
    padL: number
    padR: number
    gap: number
    titleSize: number
    metaSize: number
    priceSize: number
  }
> = {
  compact: {
    artSize: 40,
    padY: 10,
    padL: 14,
    padR: 38,
    gap: 12,
    titleSize: 13,
    metaSize: 11,
    priceSize: 14,
  },
  cozy: {
    artSize: 56,
    padY: 14,
    padL: 14,
    padR: 44,
    gap: 14,
    titleSize: 14.5,
    metaSize: 11.5,
    priceSize: 16,
  },
  roomy: {
    artSize: 64,
    padY: 18,
    padL: 18,
    padR: 48,
    gap: 16,
    titleSize: 16,
    metaSize: 12,
    priceSize: 18,
  },
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatShowTime(timeStr: string | null): string | null {
  if (!timeStr) return null
  const parts = timeStr.split(':').map(Number)
  const hours = parts[0]
  const minutes = parts[1]
  if (hours === undefined || minutes === undefined) return null
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function formatRelTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor(diff / 60000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function isStale(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() > 24 * 3600 * 1000
}

interface WatchingItemProps {
  show: WatchingShow
  density: Density
  onRemove: (userEventId: string) => void
}

export function WatchingItem({ show, density, onRemove }: WatchingItemProps) {
  const cfg = DENSITY_CONFIG[density]
  const router = useRouter()
  const isSoldOut = show.watchStatus === 'soldout'
  const stale = isStale(show.updatedAt)
  const showTime = formatShowTime(show.showTime)
  const dateLabel = formatDateLabel(show.date)

  const metaLine = [show.venueName, dateLabel, showTime]
    .filter(Boolean)
    .join(' · ')

  const attending = useAttendingToggle()

  // `undefined` means "not read yet". The record lives in localStorage, so the
  // server render can't know it — starting at undefined keeps the first client
  // paint identical to the server's and avoids a hydration mismatch.
  const [answered, setAnswered] = useState<NudgeOutcome | null | undefined>(
    undefined,
  )
  // Keyed on the watch row, so unwatching and re-watching clears the answer and
  // the nudge is free to ask again.
  useEffect(() => {
    setAnswered(readNudgeState(show.userEventId))
  }, [show.userEventId])

  // An optimistic row's id is a placeholder the server response replaces, so an
  // answer recorded against it would be forgotten the moment the real id lands
  // and the nudge would reappear. Hold it back for that one network hop.
  const nudging =
    answered === null &&
    !isOptimisticWatchRow(show.userEventId) &&
    isInNudgeWindow(show)

  const answer = (outcome: NudgeOutcome) => {
    markNudge(show.userEventId, outcome)
    setAnswered(outcome)
  }

  const card = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${cfg.artSize}px 1fr auto`,
        gap: cfg.gap,
        alignItems: 'center',
        padding: `${cfg.padY}px ${cfg.padR}px ${cfg.padY}px ${cfg.padL}px`,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        opacity: isSoldOut ? 0.78 : 1,
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(ev) => {
        ;(ev.currentTarget as HTMLDivElement).style.background =
          'color-mix(in oklab, var(--overlay-hover), var(--surface-1))'
      }}
      onMouseLeave={(ev) => {
        ;(ev.currentTarget as HTMLDivElement).style.background =
          'var(--surface-1)'
      }}
      onClick={() => {
        router.push(`/events/${show.eventId}`)
      }}
    >
      {/* Identity art */}
      <Link
        href={`/events/${show.eventId}`}
        onClick={(ev) => ev.stopPropagation()}
        tabIndex={-1}
        aria-hidden
        style={{
          display: 'block',
          width: cfg.artSize,
          height: cfg.artSize,
          borderRadius: 8,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <EventImage
          src={show.imageUrl}
          alt={show.artist}
          artist={show.artist}
          identityScale="tile"
          className="h-full w-full"
        />
      </Link>

      {/* Title block */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: density === 'roomy' ? 4 : 2,
          minWidth: 0,
        }}
      >
        <Link
          href={`/events/${show.eventId}`}
          onClick={(ev) => ev.stopPropagation()}
          style={{
            fontWeight: 700,
            fontSize: cfg.titleSize,
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
          }}
        >
          {show.artist}
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: cfg.metaSize,
            color: 'var(--fg-muted)',
            letterSpacing: '0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {metaLine}
        </span>
        {density === 'roomy' && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.02em',
            }}
          >
            {COPY.watchingItem.savedPrefix} {formatRelTime(show.savedAt)}
            {show.savedPrice !== null && (
              <>
                {' '}
                <span style={{ opacity: 0.4 }}>·</span>{' '}
                {COPY.watchingItem.savedPricePrefix}
                {Math.round(show.savedPrice)}
              </>
            )}
          </span>
        )}
      </div>

      {/* Price column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          flexShrink: 0,
        }}
      >
        {/* Current price or status pill */}
        {isSoldOut ? (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--warning)',
              border: '1px solid var(--warning)',
              borderRadius: 4,
              padding: '3px 8px',
              background:
                'color-mix(in oklch, var(--warning) 14%, transparent)',
            }}
          >
            {COPY.watchingItem.soldOut}
          </span>
        ) : show.currentPrice === null ? (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              color: 'var(--fg-subtle)',
              letterSpacing: '0.04em',
            }}
          >
            {COPY.watchingItem.priceTba}
          </span>
        ) : (
          <>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: cfg.priceSize,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                color:
                  show.currentPrice < (show.savedPrice ?? Infinity)
                    ? 'var(--success)'
                    : 'var(--fg)',
              }}
            >
              ${Math.round(show.currentPrice)}
            </span>
            {stale && (
              <span
                title={COPY.watchingItem.staleTooltip(
                  formatRelTime(show.updatedAt),
                )}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--warning)',
                  border:
                    '1px solid color-mix(in oklch, var(--warning) 50%, transparent)',
                  background:
                    'color-mix(in oklch, var(--warning) 10%, transparent)',
                  padding: '1px 5px',
                  borderRadius: 2,
                  cursor: 'help',
                  whiteSpace: 'nowrap',
                }}
              >
                {COPY.watchingItem.stalePrefix}
                {formatRelTime(show.updatedAt)}
              </span>
            )}
          </>
        )}

        {/* Delta tag */}
        {!isSoldOut && (
          <DeltaTag
            savedPrice={show.savedPrice}
            currentPrice={show.currentPrice}
          />
        )}

        {/* Source pill — only meaningful when a live price is shown */}
        {!isSoldOut && show.currentPrice !== null && (
          <SourcePill sourceKind={show.sourceKind} />
        )}
      </div>

      {/* Remove button — absolutely positioned top-right inside padR */}
      <button
        type="button"
        aria-label={COPY.watchingItem.removeAriaLabel(show.artist)}
        onClick={(ev) => {
          ev.stopPropagation()
          onRemove(show.userEventId)
        }}
        style={{
          position: 'absolute',
          top: cfg.padY,
          right: 8,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          color: 'var(--fg-subtle)',
          padding: 0,
        }}
        onMouseEnter={(ev) => {
          ;(ev.currentTarget as HTMLButtonElement).style.color = 'var(--fg)'
        }}
        onMouseLeave={(ev) => {
          ;(ev.currentTarget as HTMLButtonElement).style.color =
            'var(--fg-subtle)'
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M1 1l10 10M11 1L1 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )

  if (!nudging) return card

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {card}
      <GoingNudge
        show={show}
        onYes={() => {
          // Closes immediately — the mutation is optimistic, and re-asking
          // mid-flight would read as a failure. But the per-device record is
          // only written once the server agrees: persisting up front would
          // silently swallow a failed commitment and leave no way to retry.
          setAnswered('going')
          attending.mutate(
            { eventId: show.eventId, going: true },
            {
              onSuccess: () => markNudge(show.userEventId, 'going'),
              onError: () => setAnswered(null),
            },
          )
        }}
        onDismiss={() => answer('dismissed')}
      />
    </div>
  )
}
