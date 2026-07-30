'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { LandingPoster } from './LandingPoster'
import type { LandingShow } from './LandingPoster'
import { LANDING_POSTER_COPY } from './definitions/copy'

// Link chrome for the top poster in the stack. Hover/focus/press states need
// real CSS pseudo-classes, and the lift has to compose with the inline stack
// transform on the layer above it — hence a nested element with its own class
// rather than more inline style.
const LP_LINK_CSS = `
.lp-poster-link {
  display: block;
  position: relative;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: transform 140ms, box-shadow 140ms;
}
.lp-poster-link:hover,
.lp-poster-link:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px color-mix(in oklch, var(--bg) 62%, transparent);
}
.lp-poster-link:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 3px;
}
.lp-poster-link:active {
  transform: scale(0.99);
}
.lp-poster-arrow {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 32px;
  height: 32px;
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--signal);
  color: var(--fg-on-accent);
  font-weight: 800;
  font-size: 15px;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 140ms, transform 140ms;
  pointer-events: none;
}
.lp-poster-link:hover .lp-poster-arrow,
.lp-poster-link:focus-visible .lp-poster-arrow,
.lp-poster-link:active .lp-poster-arrow {
  opacity: 1;
  transform: translateX(0);
}
@media (prefers-reduced-motion: reduce) {
  .lp-poster-link,
  .lp-poster-arrow {
    transition: none;
  }
  .lp-poster-link:hover,
  .lp-poster-link:focus-visible,
  .lp-poster-link:active {
    transform: none;
  }
  .lp-poster-link:hover .lp-poster-arrow,
  .lp-poster-link:focus-visible .lp-poster-arrow,
  .lp-poster-link:active .lp-poster-arrow {
    transform: none;
  }
}
`

function lpShuffle<T>(arr: T[]): T[] {
  const out = arr.slice()
  for (let ii = out.length - 1; ii > 0; ii--) {
    const jj = Math.floor(Math.random() * (ii + 1))
    const tmp = out[ii]!
    out[ii] = out[jj]!
    out[jj] = tmp
  }
  return out
}

// ── LPStack ───────────────────────────────────────────────────────

interface LPStackProps {
  shows: LandingShow[]
  width: number
  height: number
  intervalMs?: number
}

function LPStack({ shows, width, height, intervalMs = 5200 }: LPStackProps) {
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'rest' | 'advancing'>('rest')

  const advance = useCallback(() => {
    if (phase !== 'rest') return
    setPhase('advancing')
    setTimeout(() => {
      setIdx((prev) => (prev + 1) % shows.length)
      setPhase('rest')
    }, 900)
  }, [phase, shows.length])

  useEffect(() => {
    if (shows.length < 2) return
    const timer = setTimeout(advance, intervalMs)
    return () => clearTimeout(timer)
  }, [advance, idx, intervalMs, shows.length])

  if (!shows.length) return null

  const off = width * 0.04
  const layers = [
    { xx: 0, yy: 0, rr: -1.5, scale: 1, opacity: 1 },
    { xx: off, yy: off * 0.7, rr: 3.5, scale: 0.985, opacity: 1 },
    { xx: -off * 0.8, yy: off * 1.4, rr: -5, scale: 0.97, opacity: 1 },
    { xx: off * 0.4, yy: off * 2.4, rr: 1.0, scale: 0.94, opacity: 0 },
  ] as const

  const padX = Math.max(28, Math.round(width * 0.14))
  const padY = Math.max(36, Math.round(width * 0.18))
  const stageW = width + padX * 2
  const stageH = height + padY * 2

  const order: LandingShow[] = [
    shows[idx % shows.length]!,
    shows[(idx + 1) % shows.length]!,
    shows[(idx + 2) % shows.length]!,
    shows[(idx + 3) % shows.length]!,
  ]

  return (
    <div
      style={{
        width: stageW,
        height: stageH,
        position: 'relative',
        perspective: 1400,
      }}
    >
      <style>{LP_LINK_CSS}</style>
      {([0, 1, 2, 3] as const).map((ii) => {
        const layer = layers[ii]
        const isTop = ii === 0
        const isMid = ii === 1
        const isBottom = ii === 2
        const isOnDeck = ii === 3

        let transform: string
        let opacity: number

        if (phase === 'advancing') {
          if (isTop) {
            transform = `translate(${layer.xx - width * 0.06}px, ${layer.yy - height * 0.14}px) rotate(${layer.rr - 10}deg) scale(${layer.scale * 1.03})`
            opacity = 0
          } else if (isMid) {
            transform = `translate(${layers[0].xx}px, ${layers[0].yy}px) rotate(${layers[0].rr}deg) scale(${layers[0].scale})`
            opacity = 1
          } else if (isBottom) {
            transform = `translate(${layers[1].xx}px, ${layers[1].yy}px) rotate(${layers[1].rr}deg) scale(${layers[1].scale})`
            opacity = 1
          } else {
            transform = `translate(${layers[2].xx}px, ${layers[2].yy}px) rotate(${layers[2].rr}deg) scale(${layers[2].scale})`
            opacity = 1
          }
        } else {
          transform = `translate(${layer.xx}px, ${layer.yy}px) rotate(${layer.rr}deg) scale(${layer.scale})`
          opacity = layer.opacity
        }

        const brightnessFilter = isOnDeck
          ? 'brightness(0.90)'
          : isBottom
            ? 'brightness(0.92)'
            : isMid
              ? 'brightness(0.96)'
              : 'none'

        const show = order[ii]!
        const poster = (
          <LandingPoster show={show} width={width} height={height} />
        )

        return (
          <div
            key={`${idx}-${ii}`}
            // Only the front poster is reachable. The three behind it are
            // decoration for the same four shows the pager already exposes, so
            // exposing them would put duplicate links in the tab order.
            aria-hidden={isTop ? undefined : true}
            style={{
              position: 'absolute',
              left: padX,
              top: padY,
              zIndex: 10 - ii,
              transform,
              transformOrigin: '30% 100%',
              transition:
                phase === 'advancing'
                  ? 'transform 0.85s cubic-bezier(0.32, 0.72, 0.28, 1), opacity 0.7s ease-out'
                  : 'transform 0.4s ease-out, opacity 0.4s ease-out',
              opacity,
              willChange: 'transform, opacity',
              filter: brightnessFilter,
              pointerEvents: isTop && show.href ? 'auto' : 'none',
            }}
          >
            {isTop && show.href ? (
              <Link
                href={show.href}
                className="lp-poster-link"
                aria-label={LANDING_POSTER_COPY.showLinkLabel(
                  show.artist,
                  show.venue,
                  show.dateShort,
                )}
              >
                {poster}
                <span aria-hidden className="lp-poster-arrow">
                  →
                </span>
              </Link>
            ) : (
              poster
            )}
          </div>
        )
      })}

      {shows.length > 1 && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: Math.round(padY * 0.25),
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 6,
            zIndex: 20,
          }}
        >
          {shows.map((_, dotIdx) => {
            const isActive = dotIdx === idx % shows.length
            return (
              // The stage itself is inert now, so the pager is the only manual
              // advance — it has to be a real button to be keyboard reachable.
              <button
                key={dotIdx}
                type="button"
                aria-label={LANDING_POSTER_COPY.goToPoster(dotIdx + 1)}
                aria-current={isActive || undefined}
                onClick={() => {
                  if (isActive || phase !== 'rest') return
                  setIdx(dotIdx)
                }}
                style={{
                  all: 'unset',
                  // `all: unset` resets display to inline, where width and
                  // height are ignored — the dot would render 0x0.
                  display: 'block',
                  cursor: 'pointer',
                  boxSizing: 'content-box',
                  width: isActive ? 16 : 6,
                  height: 6,
                  padding: '12px 5px',
                  borderRadius: 3,
                  background: isActive
                    ? 'var(--fg, #fff)'
                    : 'rgba(255,255,255,0.30)',
                  // Keeps the dot 6px tall while the button's hit area is 30px.
                  backgroundClip: 'content-box',
                  transition: 'width 0.3s',
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── LPTicker ──────────────────────────────────────────────────────

interface LPTickerProps {
  shows: LandingShow[]
  width: number
  height: number
  durationMs?: number
}

function LPTicker({ shows, width, height, durationMs = 6000 }: LPTickerProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((xx) => xx + 1), durationMs)
    return () => clearInterval(timer)
  }, [durationMs])

  const nn = Math.max(shows.length, 4)
  const cards: LandingShow[] = []
  for (let ii = 0; ii < nn + 1; ii++) {
    cards.push(shows[(tick + ii) % shows.length]!)
  }

  const gap = Math.round(width * 0.06)
  const cardW = width
  const stripW = (cardW + gap) * cards.length
  const padY = Math.round(width * 0.1)
  const stageH = height + padY * 2

  return (
    <div
      style={{
        width: '100%',
        height: stageH,
        overflow: 'hidden',
        position: 'relative',
        maskImage:
          'linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
      }}
    >
      <div
        key={tick}
        style={{
          position: 'absolute',
          left: 0,
          top: padY,
          width: stripW,
          display: 'flex',
          gap,
          animation: `lpTickerSlide ${durationMs}ms linear`,
        }}
      >
        {cards.map((show, ii) => (
          <div
            key={`${tick}-${ii}-${show.id}`}
            style={{
              flexShrink: 0,
              transform: `rotate(${ii % 2 === 0 ? -1.6 : 1.6}deg)`,
            }}
          >
            <LandingPoster show={show} width={cardW} height={height} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes lpTickerSlide {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${cardW + gap}px); }
        }
      `}</style>
    </div>
  )
}

// ── LPWall ────────────────────────────────────────────────────────

interface LPWallProps {
  shows: LandingShow[]
  width: number
  height: number
  columnHeight?: number
  durationMs?: number
}

function LPWall({
  shows,
  width,
  height,
  columnHeight,
  durationMs = 22000,
}: LPWallProps) {
  const deck = [...shows, ...shows]
  const gap = Math.round(width * 0.08)
  const tileH = height
  const colH = columnHeight ?? (tileH + gap) * shows.length

  return (
    <div
      style={{
        width,
        height: colH,
        overflow: 'hidden',
        position: 'relative',
        maskImage:
          'linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          gap,
          animation: `lpWallSlide ${durationMs}ms linear infinite`,
          willChange: 'transform',
        }}
      >
        {deck.map((show, ii) => (
          <div
            key={`${ii}-${show.id}`}
            style={{ transform: `rotate(${ii % 2 === 0 ? -1.2 : 1.2}deg)` }}
          >
            <LandingPoster show={show} width={width} height={tileH} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes lpWallSlide {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-${(tileH + gap) * shows.length}px); }
        }
      `}</style>
    </div>
  )
}

// ── LandingPosterAnimation ────────────────────────────────────────

interface LandingPosterAnimationProps {
  mode?: 'stack' | 'ticker' | 'wall'
  shows?: LandingShow[]
  width?: number
  height?: number
  intervalMs?: number
}

export function LandingPosterAnimation({
  mode = 'stack',
  shows = [],
  width = 320,
  height,
  intervalMs = 5200,
}: LandingPosterAnimationProps) {
  const hh = height ?? Math.round(width * 1.38)
  const [ordered, setOrdered] = useState<LandingShow[]>(shows)

  useEffect(() => {
    setOrdered(lpShuffle(shows))
  }, [shows])

  if (!ordered.length) return null

  if (mode === 'ticker') {
    return (
      <LPTicker
        shows={ordered}
        width={width}
        height={hh}
        durationMs={intervalMs * 1.15}
      />
    )
  }
  if (mode === 'wall') {
    return (
      <LPWall
        shows={ordered}
        width={width}
        height={hh}
        durationMs={intervalMs * 4}
      />
    )
  }
  return (
    <LPStack
      shows={ordered}
      width={width}
      height={hh}
      intervalMs={intervalMs}
    />
  )
}
