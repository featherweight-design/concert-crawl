import React from 'react'
import {
  identityFor,
  ia_isDark,
} from '@/components/consumer/identity-art/IdentityArt'
import { IdentityArtPrint } from '@/components/consumer/identity-art/IdentityArtPrint'
import {
  SC_METRICS,
  SC_RATIOS,
  type ShareRatio,
} from '@/components/consumer/share/definitions/ratios'
import { ShareWordmark } from '@/components/consumer/share/ShareWordmark'
import { StatePill } from '@/components/consumer/share/StatePill'
import type { PosterEvent } from '@/lib/share/poster-event'
import { fitTitleSize } from '@/lib/share/poster-title'
import { posterTagline } from '@/lib/share/taglines'

// ── Why this file looks the way it does ────────────────────────────
// Everything here renders inside satori, not a browser. That rules out
// `mixBlendMode`, `backdropFilter`, `maskImage`, SVG <filter> and percentage
// sizing, and it means any element with more than one child needs an explicit
// `display: 'flex'`. The identity art layer solves the same constraints in
// `IdentityArtPrint` — this file must not invent a second approach.

export interface PosterCardProps {
  event: PosterEvent
  ratio: ShareRatio
  /** Resolved theme tokens from `lib/share/theme-tokens.ts`. */
  tokens: Record<string, string>
  /** `@handle`, or null for an anonymous share — which draws no signature. */
  handle: string | null
}

/**
 * Split the paper hex into a channel triple so the scrim can fade the exact
 * paper colour in. `rgba(var(--x))` is not available to satori, and a scrim in
 * any other colour reads as a grey haze over the art.
 */
const paperChannels = (paper: string): string => {
  const rr = Number.parseInt(paper.slice(1, 3), 16)
  const gg = Number.parseInt(paper.slice(3, 5), 16)
  const bb = Number.parseInt(paper.slice(5, 7), 16)
  return `${rr},${gg},${bb}`
}

/**
 * The locked scrim ramp. Transparent through 38% so the top half of the card
 * is genuinely unobstructed art, then opaque by 62% so the title, venue,
 * tagline and wordmark all read against flat paper rather than over texture.
 */
const scrimGradient = (paper: string): string => {
  const channels = paperChannels(paper)
  const rgba = (alpha: number): string => `rgba(${channels},${alpha})`
  return `linear-gradient(180deg, ${rgba(0)} 0%, ${rgba(0)} 38%, ${rgba(0.85)} 52%, ${rgba(1)} 62%, ${rgba(1)} 100%)`
}

/**
 * Direction B — the poster. Full-bleed identity art over the top half, heavy
 * display type in the bottom block, one mis-registered ghost pass on the
 * title so the card reads as printed rather than composited.
 */
export const PosterCard = ({
  event,
  ratio,
  tokens,
  handle,
}: PosterCardProps) => {
  const { width, height } = SC_RATIOS[ratio]
  const metrics = SC_METRICS[ratio]

  // The card is drawn in the artist's own identity palette, not the theme's.
  // That is the Phase 7.5 contract: two people sharing the same show get the
  // same artwork whatever theme either of them is running.
  const identity = identityFor(event.artist, 'artist')
  const paper = identity.palette.bg
  const ink = identity.palette.ink
  const ghostInk = ia_isDark(paper)
    ? 'rgba(255,255,255,0.14)'
    : 'rgba(0,0,0,0.12)'

  // Satori cannot measure text, so the title size is estimated up front from
  // the artist's longest word rather than reacting to an overflow.
  const contentWidth = width - metrics.padding * 2
  const titleSize = fitTitleSize(event.artist, metrics.title, contentWidth)

  const accent = tokens.accent ?? ink
  // `link` is a 628px-tall strip. The tagline is the first thing to go.
  const showTagline = ratio !== 'link'

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        backgroundColor: paper,
      }}
    >
      {/* Exactly half the card height — the scrim ramp is authored against it. */}
      <IdentityArtPrint
        name={event.artist}
        kind="artist"
        scale="hero"
        width={width}
        height={Math.round(height / 2)}
        showInitials={false}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />

      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          backgroundImage: scrimGradient(paper),
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute',
          left: metrics.padding,
          bottom: metrics.padding,
          width: contentWidth,
          gap: metrics.gap,
        }}
      >
        {/* Metadata row — state pill left, date + time right. */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 24,
          }}
        >
          <StatePill
            state={event.state}
            dropLabel={event.dropLabel}
            accent={accent}
            fontSize={metrics.pill}
            paddingY={metrics.pillPaddingY}
            paddingX={metrics.pillPaddingX}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              fontFamily: 'JetBrains Mono',
              fontWeight: 700,
              color: ink,
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: metrics.date,
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              {event.dateShort}
            </div>
            {event.showTime !== null && (
              <div
                style={{
                  display: 'flex',
                  marginTop: 4,
                  fontSize: metrics.time,
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                  opacity: 0.85,
                }}
              >
                {event.showTime}
              </div>
            )}
          </div>
        </div>

        {/* Title, with its mis-registration ghost behind it. */}
        <div
          style={{ display: 'flex', position: 'relative', width: contentWidth }}
        >
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              left: metrics.ghostX,
              top: metrics.ghostY,
              width: contentWidth,
              fontFamily: 'Inter',
              fontWeight: 900,
              fontSize: titleSize,
              lineHeight: 0.86,
              letterSpacing: '-0.06em',
              color: ghostInk,
              textTransform: 'uppercase',
            }}
          >
            {event.artist}
          </div>
          <div
            style={{
              display: 'flex',
              width: contentWidth,
              fontFamily: 'Inter',
              fontWeight: 900,
              fontSize: titleSize,
              lineHeight: 0.86,
              letterSpacing: '-0.06em',
              color: ink,
              textTransform: 'uppercase',
            }}
          >
            {event.artist}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: metrics.subtitle,
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: ink,
          }}
        >
          {`${event.venue} · ${event.city}`}
        </div>

        {showTagline && (
          <div
            style={{
              display: 'flex',
              fontFamily: 'Inter',
              fontWeight: 400,
              fontSize: metrics.tagline,
              lineHeight: 1.3,
              color: ink,
              opacity: 0.78,
            }}
          >
            {`“${posterTagline(event.state)}”`}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 24,
            marginTop: ratio === 'story' ? 16 : 8,
            paddingTop: ratio === 'story' ? 28 : 18,
            borderTop: `2px solid ${ink}`,
          }}
        >
          <ShareWordmark size={metrics.wordmark} color={ink} />
          {/* Anonymous shares render no signature line at all. */}
          {handle !== null && (
            <div
              style={{
                display: 'flex',
                fontFamily: 'JetBrains Mono',
                fontWeight: 700,
                fontSize: metrics.handle,
                letterSpacing: '0.04em',
                lineHeight: 1,
                color: ink,
                opacity: 0.85,
              }}
            >
              {handle}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
