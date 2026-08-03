import React from 'react'
import {
  PP_MODES,
  scalePassportMode,
  type PassportMode,
} from '@/components/consumer/passport/definitions/modes'
import { PassportMoreTile } from '@/components/consumer/passport/PassportMoreTile'
import { PassportPill } from '@/components/consumer/passport/PassportPill'
import { PassportStamp } from '@/components/consumer/passport/PassportStamp'
import { PassportStat } from '@/components/consumer/passport/PassportStat'
import { ShareWordmark } from '@/components/consumer/share/ShareWordmark'
import { DENVER_TIME_ZONE } from '@/lib/time'
import { PASSPORT_COPY } from '@/components/consumer/passport/definitions/copy'
import { passportHandle } from '@/lib/passport/stamp'
import { passportStats, type AttendedShow } from '@/lib/passport/stats'

// ── Why this file looks the way it does ────────────────────────────
// The `share` mode renders inside satori, not a browser: no `mixBlendMode`, no
// `maskImage`, no percentage sizing, and any element with more than one child
// needs an explicit `display: 'flex'`. The `compact` mode renders in a real
// browser. Both come out of this one component, because two components is how
// the in-app preview starts advertising a card the PNG does not match.

export interface PassportCardProps {
  mode?: PassportMode
  /** Attended shows, most recent first. */
  shows: AttendedShow[]
  /** Resolved theme tokens from `lib/share/theme-tokens.ts`. */
  tokens: Record<string, string>
  /** The account's handle. Nullable — `user_profiles.handle` is. */
  handle: string | null
  year: number
  /** Device-pixel multiplier. See `PASSPORT_PRINT_SCALE`. */
  scale?: number
}

const SINCE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: DENVER_TIME_ZONE,
  month: 'short',
  year: 'numeric',
})

// UTC-noon anchored for the same reason as the stamp punch (#596).
const sinceLabel = (date: string | undefined): string | null => {
  if (date === undefined) return null
  const at = new Date(`${date}T12:00:00Z`)
  return Number.isNaN(at.getTime()) ? null : SINCE_FORMAT.format(at)
}

/**
 * The Concert Passport — a stamp book of nights you were there.
 *
 * Not a per-event share card: this is the one card that is about the person
 * rather than a single gig, which is also why it has no anonymous variant. A
 * passport with no name on it is not a passport.
 */
export const PassportCard = ({
  mode = 'share',
  shows,
  tokens,
  handle,
  year,
  scale = 1,
}: PassportCardProps) => {
  const cfg =
    scale === 1 ? PP_MODES[mode] : scalePassportMode(PP_MODES[mode], scale)
  const print = mode === 'share'
  const stats = passportStats(shows)
  const who = passportHandle(handle)

  const capacity = cfg.cols * cfg.rows
  // An overflowing wall spends its final slot on the `+N more` tile, so only
  // `capacity - 1` shows are surfaced — and the tile therefore has to count the
  // show that slot displaced too, not just the ones past capacity.
  const surfaced = shows.slice(
    0,
    shows.length > capacity ? capacity - 1 : capacity,
  )
  const overflow = shows.length - surfaced.length

  const since = sinceLabel(stats.first?.date)

  // Satori has no grid and no percentage sizing, so the wall is laid out as
  // wrapping rows of explicitly-sized tiles. The same arithmetic drives both
  // modes, which is what keeps the preview and the PNG in proportion.
  const wallWidth = cfg.width - cfg.pad * 2
  const wallHeight = cfg.height - cfg.padTop - (cfg.padBottom - cfg.gap)
  const tileWidth = (wallWidth - cfg.gap * (cfg.cols - 1)) / cfg.cols
  const tileHeight = (wallHeight - cfg.gap * (cfg.rows - 1)) / cfg.rows

  const bg = tokens['bg'] ?? '#06070F'
  const fg = tokens['fg'] ?? '#FFFFFF'
  const fgMuted = tokens['fg-muted'] ?? '#9AA8C7'
  const signal = tokens['signal'] ?? '#22D3EE'
  const scrim = tokens['scrim'] ?? 'rgba(6,7,15,0.62)'
  const surface = tokens['surface-1'] ?? '#12131F'
  const borderStrong = tokens['border-strong'] ?? 'rgba(255,255,255,0.22)'

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: cfg.width,
        height: cfg.height,
        overflow: 'hidden',
        borderRadius: cfg.radius,
        background: bg,
        color: fg,
        fontFamily: 'Inter',
      }}
    >
      {/* Identity-art stamp wall */}
      <div
        style={{
          position: 'absolute',
          top: cfg.padTop,
          left: cfg.pad,
          display: 'flex',
          flexWrap: 'wrap',
          width: wallWidth,
          height: wallHeight,
          gap: cfg.gap,
        }}
      >
        {surfaced.map((show) => (
          <PassportStamp
            key={show.id}
            show={show}
            cfg={cfg}
            width={tileWidth}
            height={tileHeight}
          />
        ))}
        {overflow > 0 && (
          <PassportMoreTile
            count={overflow}
            cfg={cfg}
            width={tileWidth}
            height={tileHeight}
            surface={surface}
            border={borderStrong}
            fg={fg}
            fgMuted={fgMuted}
          />
        )}
      </div>

      {/* Header — glass pills floating over the top of the wall */}
      <div
        style={{
          position: 'absolute',
          top: cfg.pad,
          left: cfg.pad,
          width: cfg.width - cfg.pad * 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <PassportPill cfg={cfg} scrim={scrim} print={print}>
          <div
            style={{
              display: 'flex',
              width: cfg.pillGap * 1.1,
              height: cfg.pillGap * 1.1,
              borderRadius: 999,
              background: signal,
            }}
          />
          {`${PASSPORT_COPY.eyebrow} · ${year}`}
        </PassportPill>
        <PassportPill
          cfg={cfg}
          scrim={scrim}
          print={print}
          muted
          fontSize={cfg.headHandle}
        >
          {who}
        </PassportPill>
      </div>

      {/*
        The panel scrim. On screen this is a blurred, mask-faded glass band; in
        print satori supports neither `backdropFilter` nor `maskImage`, so the
        same read is built from an extra opaque gradient stop instead. Same
        visual, two implementations — the alternative is a print card whose
        bottom third is unreadable over a bright stamp.
      */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          display: 'flex',
          width: cfg.width,
          height: cfg.padBottom,
          background: print
            ? `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${bg} 42%, ${bg} 100%)`
            : `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${bg} 58%)`,
          ...(print
            ? {}
            : {
                backdropFilter: 'blur(9px)',
                WebkitBackdropFilter: 'blur(9px)',
                WebkitMaskImage:
                  'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 42%)',
                maskImage:
                  'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 42%)',
              }),
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: cfg.panelPadX,
          bottom: cfg.panelPadB,
          width: cfg.width - cfg.panelPadX * 2,
          display: 'flex',
          flexDirection: 'column',
          gap: cfg.panelGap,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: cfg.panelPadX * 0.9,
          }}
        >
          <PassportStat
            value={stats.nights}
            label={
              stats.nights === 1
                ? PASSPORT_COPY.statNight
                : PASSPORT_COPY.statNights
            }
            cfg={cfg}
            fg={fg}
            fgMuted={fgMuted}
            signal={signal}
            accent
          />
          <PassportStat
            value={stats.venues}
            label={
              stats.venues === 1
                ? PASSPORT_COPY.statVenue
                : PASSPORT_COPY.statVenues
            }
            cfg={cfg}
            fg={fg}
            fgMuted={fgMuted}
            signal={signal}
          />
          <PassportStat
            value={stats.topGenre?.name ?? PASSPORT_COPY.noGenre}
            label={PASSPORT_COPY.statTopGenre}
            cfg={cfg}
            fg={fg}
            fgMuted={fgMuted}
            signal={signal}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: cfg.pad,
            paddingTop: cfg.panelGap * 0.7,
            borderTop: `${cfg.hairline}px solid ${borderStrong}`,
          }}
        >
          <ShareWordmark size={cfg.wordmark} color={fg} />
          <span
            style={{
              fontFamily: 'JetBrains Mono',
              fontWeight: 700,
              fontSize: cfg.footTag,
              letterSpacing: '0.14em',
              color: fgMuted,
              whiteSpace: 'nowrap',
            }}
          >
            {since === null
              ? PASSPORT_COPY.footerNoHistory
              : `${PASSPORT_COPY.footerSincePrefix} ${since.toUpperCase()}`}
          </span>
        </div>
      </div>
    </div>
  )
}
