// The Passport teaser (#70), design_handoff_concert_history/history-routes.jsx:300-351.
//
// This is the ENTIRE Passport scope in this build. The keepsake card itself —
// the 320×500 compact, the 1080×1080 share render, the rasterization — is owned
// by #85 and deliberately not built here.
//
// #85 has shipped /passport, so the strip is a link. The null branch stays:
// never a dead href — a link that goes nowhere is worse than no link.

import Link from 'next/link'
import type { HistoryShow, HistoryStats } from '@concert-crawl/types'
import { StubStamp } from '@/components/consumer/going/StubStamp'
import { HISTORY_COPY } from './definitions/copy'
import { PASSPORT_ROUTE } from './definitions/constants'

const COPY = HISTORY_COPY.passport

// Three most-recent artists, padded with deterministic filler names so the strip
// keeps its shape for a one-night history.
const stampArtistsFor = (shows: readonly HistoryShow[]): string[] => {
  const recent = shows.slice(0, 3).map((show) => show.artist)
  while (recent.length < 3) recent.push(`passport-${recent.length}`)
  return recent
}

const TeaserBody = ({
  stats,
  shows,
}: {
  stats: HistoryStats
  shows: readonly HistoryShow[]
}) => (
  <>
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
        }}
      >
        {COPY.eyebrow}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 15.5,
          fontWeight: 800,
          letterSpacing: '-0.015em',
          color: 'var(--fg)',
        }}
      >
        {COPY.headline}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10.5,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: 'var(--fg-muted)',
        }}
      >
        {COPY.summary(stats.nights, stats.venues, stats.topGenre)}
      </span>
      {PASSPORT_ROUTE !== null && (
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '-0.005em',
            color: 'var(--accent)',
          }}
        >
          {COPY.link}
        </span>
      )}
    </span>
    {/* Decorative — the stat line above already carries every fact. */}
    <span aria-hidden className="flex shrink-0 gap-1.5">
      {stampArtistsFor(shows).map((artist, index) => (
        <StubStamp key={`${artist}-${index}`} artist={artist} size={32} />
      ))}
    </span>
  </>
)

const SHELL =
  'flex items-center gap-3.5 overflow-hidden rounded-[14px] px-[18px] py-4 no-underline'

const SHELL_STYLE = {
  border: '1px solid color-mix(in oklch, var(--accent) 35%, var(--border))',
  background:
    'linear-gradient(135deg, color-mix(in oklch, var(--accent) 14%, var(--surface-1)) 0%, var(--surface-1) 70%)',
} as const

export const PassportTeaser = ({
  stats,
  shows,
}: {
  stats: HistoryStats
  shows: readonly HistoryShow[]
}) => {
  if (PASSPORT_ROUTE === null) {
    return (
      <div className={SHELL} style={SHELL_STYLE}>
        <TeaserBody stats={stats} shows={shows} />
      </div>
    )
  }

  return (
    <Link
      href={PASSPORT_ROUTE}
      className={`history-passport-teaser min-h-[44px] ${SHELL}`}
      style={SHELL_STYLE}
    >
      <TeaserBody stats={stats} shows={shows} />
    </Link>
  )
}
