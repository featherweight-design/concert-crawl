'use client'

// One attended night (#70), ported from
// design_handoff_concert_history/history-screens.jsx:119-187.
//
// Deliberately mirrors WatchingItem's grid so the two lists read as siblings,
// but the right column is a StubStamp where Watching puts the price delta.
// There is no remove affordance — past attendance isn't editable in v1
// (handoff §Deliberate exclusions).

import Link from 'next/link'
import type { HistoryShow } from '@concert-crawl/types'
import { IdentityArt } from '@/components/consumer/identity-art/IdentityArt'
import { StubStamp } from '@/components/consumer/going/StubStamp'
import { HISTORY_COPY } from './definitions/copy'

export type HistoryDensity = 'compact' | 'cozy' | 'roomy'

const DENSITY_CONFIG: Record<
  HistoryDensity,
  {
    artSize: number
    padY: number
    padL: number
    padR: number
    gap: number
    titleSize: number
    metaSize: number
    stubSize: number
  }
> = {
  compact: {
    artSize: 40,
    padY: 10,
    padL: 14,
    padR: 14,
    gap: 12,
    titleSize: 13,
    metaSize: 11,
    stubSize: 24,
  },
  cozy: {
    artSize: 56,
    padY: 14,
    padL: 14,
    padR: 16,
    gap: 14,
    titleSize: 14.5,
    metaSize: 11.5,
    stubSize: 28,
  },
  roomy: {
    artSize: 64,
    padY: 18,
    padL: 18,
    padR: 20,
    gap: 16,
    titleSize: 16,
    metaSize: 12,
    stubSize: 32,
  },
}

export const HistoryItem = ({
  show,
  density,
}: {
  show: HistoryShow
  density: HistoryDensity
}) => {
  const cfg = DENSITY_CONFIG[density]

  // dateLabel and showTime arrive pre-formatted in Mountain Time — the API
  // treats date presentation as data on this surface.
  const meta = [show.venueName, show.dateLabel, show.showTime]
    .filter((part): part is string => Boolean(part))
    .join(' · ')

  const detail =
    density === 'roomy'
      ? [
          show.genre,
          show.priceFinal !== null
            ? HISTORY_COPY.item.paid(show.priceFinal)
            : null,
        ].filter((part): part is string => Boolean(part))
      : []

  return (
    <Link
      href={`/events/${show.eventId}`}
      className="history-item grid items-center rounded-xl border border-border bg-surface-1 no-underline transition-colors hover:bg-surface-2"
      style={{
        gridTemplateColumns: `${cfg.artSize}px 1fr auto`,
        gap: cfg.gap,
        padding: `${cfg.padY}px ${cfg.padR}px ${cfg.padY}px ${cfg.padL}px`,
      }}
    >
      {/* Identity art — HistoryShow carries no imageUrl, so the deterministic
          artist mark is the only art this row ever shows. */}
      <span
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
        <IdentityArt name={show.artist} kind="artist" scale="tile" />
      </span>

      <span
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: density === 'roomy' ? 4 : 2,
        }}
      >
        <span
          className="truncate"
          style={{
            fontFamily: 'var(--font-ui)',
            fontWeight: 700,
            fontSize: cfg.titleSize,
            letterSpacing: '-0.01em',
            color: 'var(--fg)',
          }}
        >
          {show.artist}
        </span>
        <span
          className="truncate"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: cfg.metaSize,
            letterSpacing: '0.02em',
            color: 'var(--fg-muted)',
          }}
        >
          {meta}
        </span>
        {detail.length > 0 && (
          <span
            className="truncate"
            style={{
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              letterSpacing: '0.02em',
              color: 'var(--fg-subtle)',
            }}
          >
            {detail.join(' · ')}
          </span>
        )}
      </span>

      {/* Stub stamp — decorative; the row's text already names the night. */}
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <StubStamp artist={show.artist} size={cfg.stubSize} />
      </span>
    </Link>
  )
}
