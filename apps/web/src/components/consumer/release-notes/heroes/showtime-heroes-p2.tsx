'use client'
import React from 'react'
import {
  ShowtimeBackdrop,
  ShowtimeEyebrow,
  ShowtimeSparkles,
  StubGlyph,
} from './showtime-base'
import { COPY } from '../definitions/copy'

// ════════════════════════════════════════════════════════════════
// 8 · ARTIST FOLLOWING · Showtime
// ════════════════════════════════════════════════════════════════
export function FollowingShowtime(): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <ShowtimeBackdrop founderGlow={false} />

      {/* slow ping rings emanating from artist plate */}
      {[0, 1.0, 2.0].map((delay, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: 140,
            top: '50%',
            width: 240,
            height: 240,
            borderRadius: '50%',
            border: '1.5px solid #FF7BD4',
            opacity: 0,
            transform: 'translate(-50%, -50%) scale(0.55)',
            animation: `p2Ping 3.4s ${delay}s ease-out infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* artist plate (identity-art riso stripes placeholder) */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: '50%',
          width: 160,
          height: 160,
          marginTop: -80,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1.5px solid rgba(255,255,255,0.18)',
          filter:
            'drop-shadow(0 12px 22px rgba(0,0,0,0.5)) drop-shadow(0 0 18px rgba(255,123,212,0.35))',
          opacity: 0,
          animation: 'pc2EyebrowEnter 700ms 0.25s ease-out both',
          zIndex: 5,
        }}
      >
        {/* riso stripes */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            background: '#2A1A2A',
          }}
        >
          {[0, 1, 2, 3, 4].map((jdx) => (
            <div
              key={jdx}
              style={{
                flex: 1,
                background: jdx % 2 === 0 ? '#FF7BD4' : '#A075FF',
                opacity: 0.85,
                transform:
                  jdx % 2 === 0 ? 'translateY(-3px)' : 'translateY(3px)',
                marginRight: jdx < 4 ? 1 : 0,
                mixBlendMode: 'screen',
              }}
            />
          ))}
        </div>
        {/* halftone overlay */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}
        >
          {Array.from({ length: 24 }).map((_, dotIdx) => {
            const col = dotIdx % 6
            const row = Math.floor(dotIdx / 6)
            const xPos = col * 16 + 10
            const yPos = row * 22 + 8
            const dist = Math.sqrt((5 - col) ** 2 + (3 - row) ** 2)
            const radius = Math.max(0.7, 3.4 - dist * 0.45)
            return (
              <circle
                key={dotIdx}
                cx={xPos}
                cy={yPos}
                r={radius}
                fill="#FFE36B"
                opacity="0.85"
              />
            )
          })}
        </svg>
        {/* artist name */}
        <div
          style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            right: 10,
            fontFamily: 'Inter, sans-serif',
            fontSize: 16,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.03em',
            textShadow: '0 2px 6px rgba(0,0,0,0.65)',
            lineHeight: 1,
          }}
        >
          RUN THE JEWELS
        </div>
        {/* + FOLLOWING bell chip — differentiated from Watching's dot */}
        <div
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
            padding: '3px 8px 3px 6px',
            background: 'rgba(0,0,0,0.62)',
            border: '1px solid #FF7BD4',
            borderRadius: 999,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8,
            fontWeight: 800,
            color: '#FF7BD4',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transformOrigin: 'top center',
              animation: 'p2HeartBeat 1.6s ease-in-out infinite',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 9 L9 9 M3 9 Q3 4 6 3 Q9 4 9 9"
                stroke="#FF7BD4"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="rgba(255,123,212,0.18)"
              />
              <circle cx="6" cy="10.5" r="0.8" fill="#FF7BD4" />
            </svg>
          </span>
          {COPY.heroes.following.followingChip}
        </div>
      </div>

      {/* right column: 2 notification cards stack */}
      <div
        style={{
          position: 'absolute',
          right: 36,
          top: '50%',
          marginTop: -86,
          width: 220,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 6,
        }}
      >
        <div
          style={{
            padding: '11px 13px',
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid #7AE6FF',
            borderRadius: 6,
            boxShadow: '0 0 18px rgba(122,230,255,0.35)',
            opacity: 0,
            animation: 'p2NotifIn 600ms 0.9s cubic-bezier(.2,.85,.2,1) both',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8.5,
              fontWeight: 800,
              color: '#7AE6FF',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              marginBottom: 5,
            }}
          >
            {COPY.heroes.following.newShowAnnounced}
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: 4,
            }}
          >
            Red Rocks · Morrison
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
            }}
          >
            Aug 22 · Sat
          </div>
        </div>

        <div
          style={{
            padding: '9px 13px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            opacity: 0,
            animation: 'p2NotifIn 600ms 1.4s cubic-bezier(.2,.85,.2,1) both',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8.5,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '1.6px',
              textTransform: 'uppercase',
            }}
          >
            Presale
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 800,
              color: '#FFE36B',
              letterSpacing: '1.4px',
            }}
          >
            WED 10 AM
          </div>
        </div>
      </div>

      <ShowtimeEyebrow dotHue="#FF7BD4">{COPY.heroes.following.eyebrow}</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 9 · PRICE DROP ALERTS · Showtime
// ════════════════════════════════════════════════════════════════
// Centred composition: header → price ticker → descending arrow trail
// → SAVED chip → full-width thin sparkline floor. All vertical, all
// centred — no left/right asymmetry.
export function PriceDropShowtime(): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <ShowtimeBackdrop founderGlow={false} />

      {/* central halo — leans amber/lime to signal "save" */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 300,
          height: 300,
          marginLeft: -150,
          marginTop: -150,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(201,242,110,0.22) 0%, rgba(255,184,56,0.10) 35%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* MAIN centred column */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
          width: 360,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: 0,
            animation: 'pc2EyebrowEnter 700ms 0.3s ease-out both',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8.5,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
            }}
          >
            Resale · Tame Impala · Red Rocks
          </div>

          {/* price stack */}
          <div
            style={{
              position: 'relative',
              height: 96,
              width: 220,
              marginTop: 6,
            }}
          >
            {/* old price — slides up + fades */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                transform: 'translateX(-50%)',
                fontFamily: 'Inter, sans-serif',
                fontSize: 32,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '-0.04em',
                textDecoration: 'line-through',
                textDecorationColor: 'rgba(255,255,255,0.45)',
                animation: 'p2OldOut 4.0s 1.1s ease-in-out infinite',
              }}
            >
              $120
            </div>

            {/* new price */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 18,
                transform: 'translateX(-50%)',
                fontFamily: 'Inter, sans-serif',
                fontSize: 74,
                fontWeight: 900,
                color: '#C9F26E',
                letterSpacing: '-0.05em',
                lineHeight: 0.9,
                textShadow: '0 0 24px rgba(201,242,110,0.45)',
                animation: 'p2NewIn 4.0s 1.1s ease-in-out infinite',
              }}
            >
              $48
            </div>

            {/* small downward arrow trail — LEFT of the price as a visual cue */}
            <div
              style={{
                position: 'absolute',
                left: -8,
                top: 14,
                width: 22,
                height: 70,
                pointerEvents: 'none',
              }}
            >
              {[0, 0.7, 1.4].map((delay, arrowIdx) => (
                <svg
                  key={arrowIdx}
                  width="22"
                  height="12"
                  viewBox="0 0 22 12"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: arrowIdx * 22,
                    opacity: 0,
                    animation: `p2ArrowFall 2.4s ${delay}s ease-in-out infinite`,
                  }}
                >
                  <path
                    d="M3 3 L11 9 L19 3"
                    fill="none"
                    stroke="#C9F26E"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85 - arrowIdx * 0.2}
                  />
                </svg>
              ))}
            </div>
            {/* mirror trail on RIGHT for symmetry */}
            <div
              style={{
                position: 'absolute',
                right: -8,
                top: 14,
                width: 22,
                height: 70,
                pointerEvents: 'none',
              }}
            >
              {[0.35, 1.05, 1.75].map((delay, arrowIdx) => (
                <svg
                  key={arrowIdx}
                  width="22"
                  height="12"
                  viewBox="0 0 22 12"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: arrowIdx * 22,
                    opacity: 0,
                    animation: `p2ArrowFall 2.4s ${delay}s ease-in-out infinite`,
                  }}
                >
                  <path
                    d="M3 3 L11 9 L19 3"
                    fill="none"
                    stroke="#C9F26E"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85 - arrowIdx * 0.2}
                  />
                </svg>
              ))}
            </div>
          </div>

          {/* SAVED chip */}
          <div
            style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 11px',
              background: 'rgba(201,242,110,0.10)',
              border: '1.5px solid #C9F26E',
              borderRadius: 999,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 800,
              color: '#C9F26E',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              opacity: 0,
              animation: 'p2SavedIn 500ms 1.5s cubic-bezier(.2,.85,.2,1) both',
            }}
          >
            <span style={{ fontSize: 12 }}>↓</span> Saved $72
          </div>

          {/* tiny inline sparkline — trend floor */}
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: 0,
              animation: 'pc2EyebrowEnter 700ms 1.9s ease-out both',
            }}
          >
            <svg
              width="180"
              height="22"
              viewBox="0 0 180 22"
              style={{ display: 'block' }}
            >
              <polyline
                points="0,6 22,5 44,9 66,7 88,13 110,14 132,17 154,19 180,20"
                fill="none"
                stroke="#FFB838"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.75"
              />
              <circle
                cx="180"
                cy="20"
                r="2.6"
                fill="#C9F26E"
                style={{ filter: 'drop-shadow(0 0 4px #C9F26E)' }}
              />
            </svg>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.40)',
                letterSpacing: '1.6px',
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              {COPY.heroes.priceDrop.watchingTrend}
            </div>
          </div>
        </div>
      </div>

      <ShowtimeEyebrow dotHue="#C9F26E">{COPY.heroes.priceDrop.eyebrow}</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 10 · SETLIST PREVIEW · Showtime
// ════════════════════════════════════════════════════════════════
interface TrackRow {
  num: string
  name: string
  dur: string
  debut: boolean
}

export function SetlistShowtime(): React.ReactElement {
  const tracks: TrackRow[] = [
    { num: '01', name: 'INSIDE OUT', dur: '4:12', debut: false },
    { num: '02', name: 'ONE MORE HOUR', dur: '3:48', debut: false },
    { num: '03', name: 'LET IT HAPPEN', dur: '5:21', debut: false },
    { num: '04', name: 'THE LESS I KNOW THE BETTER', dur: '6:04', debut: true },
    { num: '05', name: 'EVENTUALLY', dur: '7:18', debut: false },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <ShowtimeBackdrop founderGlow={false} />

      {/* central halo behind receipt */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 360,
          height: 280,
          marginLeft: -180,
          marginTop: -140,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, rgba(122,230,255,0.18) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* receipt card — centred horizontally and vertically */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 380,
          zIndex: 5,
        }}
      >
        <div
          style={{
            padding: '16px 22px 16px',
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 6,
            boxShadow:
              '0 18px 40px rgba(0,0,0,0.55), 0 0 24px rgba(122,230,255,0.10)',
            opacity: 0,
            animation: 'pc2EyebrowEnter 700ms 0.2s ease-out both',
          }}
        >
          {/* HEADER — centred title with mono flanks for balance */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: 12,
              paddingBottom: 9,
              borderBottom: '1px dashed rgba(255,255,255,0.20)',
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8.5,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '1.6px',
                textTransform: 'uppercase',
                textAlign: 'left',
              }}
            >
              {COPY.heroes.setlist.likelyLabel}
            </div>

            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 16,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.96)',
                letterSpacing: '-0.03em',
                lineHeight: 1,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {COPY.heroes.setlist.setlistHeading}
            </div>

            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8.5,
                fontWeight: 800,
                color: '#7AE6FF',
                letterSpacing: '1.6px',
                textTransform: 'uppercase',
                textAlign: 'right',
              }}
            >
              5 / 14
            </div>
          </div>

          {/* TRACKS — 5 rows, mono numbers + dur, Inter for name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tracks.map((track, trackIdx) => (
              <div
                key={trackIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '22px 1fr auto',
                  gap: 12,
                  alignItems: 'baseline',
                  opacity: 0,
                  animation: `p2LineType 420ms ${0.45 + trackIdx * 0.15}s cubic-bezier(.2,.85,.2,1) both`,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.42)',
                    letterSpacing: '0.8px',
                  }}
                >
                  {track.num}
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 13,
                    fontWeight: 700,
                    color: track.debut ? '#FFE36B' : 'rgba(255,255,255,0.94)',
                    letterSpacing: '-0.01em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  {track.name}
                  {track.debut && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 7,
                        fontWeight: 800,
                        color: '#FFE36B',
                        letterSpacing: '1.4px',
                        padding: '1px 5px',
                        border: '1px solid #FFE36B',
                        borderRadius: 2,
                      }}
                    >
                      ★ DEBUT?
                    </span>
                  )}
                </span>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.42)',
                    letterSpacing: '0.8px',
                  }}
                >
                  {track.dur}
                </span>
              </div>
            ))}
          </div>

          {/* FOOTER — mirror-balanced like header */}
          <div
            style={{
              marginTop: 11,
              paddingTop: 9,
              borderTop: '1px dashed rgba(255,255,255,0.20)',
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8.5,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '1.6px',
              textTransform: 'uppercase',
            }}
          >
            <span>Est. 1h 42m</span>
            <span style={{ color: '#7AE6FF' }}>{COPY.heroes.setlist.tapToSeeMore}</span>
          </div>
        </div>
      </div>

      <ShowtimeEyebrow dotHue="#7AE6FF">{COPY.heroes.setlist.eyebrow}</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 11 · VENUE FIRST-TIMER GUIDE · Showtime
// ════════════════════════════════════════════════════════════════
interface ChipDef {
  accent: string
  label: string
  fx: string
  fy: string
  delay: number
}

interface FirstTimerChipProps {
  chip: ChipDef
  side: 'left' | 'right'
}

function FirstTimerChip({
  chip,
  side,
}: FirstTimerChipProps): React.ReactElement {
  const borderSideKey = side === 'left' ? 'borderLeft' : 'borderRight'
  return (
    <div
      style={
        {
          ['--p2-fx' as string]: chip.fx,
          ['--p2-fy' as string]: chip.fy,
          opacity: 0,
          animation: `p2ChipDeal 520ms ${chip.delay}s cubic-bezier(.2,.85,.2,1) both`,
          padding: '5px 10px',
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${chip.accent}55`,
          [borderSideKey]: `2.5px solid ${chip.accent}`,
          borderRadius: 3,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          fontWeight: 800,
          color: chip.accent,
          letterSpacing: '1.4px',
          textTransform: 'uppercase' as const,
          whiteSpace: 'nowrap' as const,
          boxShadow: `0 0 10px ${chip.accent}22`,
        } as React.CSSProperties
      }
    >
      {chip.label}
    </div>
  )
}

export function FirstTimerShowtime(): React.ReactElement {
  const leftChips: ChipDef[] = [
    {
      accent: '#FFB838',
      label: COPY.heroes.firstTimer.leftChipLabels[0],
      fx: '-50px',
      fy: '0px',
      delay: 0.4,
    },
    {
      accent: '#FF7BD4',
      label: COPY.heroes.firstTimer.leftChipLabels[1],
      fx: '-50px',
      fy: '-10px',
      delay: 0.55,
    },
    {
      accent: '#A075FF',
      label: COPY.heroes.firstTimer.leftChipLabels[2],
      fx: '-50px',
      fy: '-20px',
      delay: 0.7,
    },
  ]
  const rightChips: ChipDef[] = [
    {
      accent: '#7AE6FF',
      label: COPY.heroes.firstTimer.rightChipLabels[0],
      fx: '50px',
      fy: '0px',
      delay: 0.85,
    },
    {
      accent: '#C9F26E',
      label: COPY.heroes.firstTimer.rightChipLabels[1],
      fx: '50px',
      fy: '-10px',
      delay: 1.0,
    },
    {
      accent: '#FFE36B',
      label: COPY.heroes.firstTimer.rightChipLabels[2],
      fx: '50px',
      fy: '-20px',
      delay: 1.15,
    },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <ShowtimeBackdrop founderGlow={false} />

      {/* central venue plate — geometric silhouette only */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 180,
          height: 180,
          transform: 'translate(-50%, -54%) scale(0.92)',
          opacity: 0,
          animation: 'p2PlateIn 700ms 0.15s cubic-bezier(.2,.85,.2,1) both',
          zIndex: 3,
          filter:
            'drop-shadow(0 12px 22px rgba(0,0,0,0.55)) drop-shadow(0 0 22px rgba(122,230,255,0.30))',
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          style={{ display: 'block' }}
        >
          {/* outer geometric plate (octagon) */}
          <polygon
            points="44,8 136,8 172,44 172,136 136,172 44,172 8,136 8,44"
            fill="rgba(255,255,255,0.04)"
            stroke="#7AE6FF"
            strokeWidth="1.6"
            opacity="0.85"
          />
          {/* inner concentric — like a venue floor plan */}
          <polygon
            points="58,28 122,28 152,58 152,122 122,152 58,152 28,122 28,58"
            fill="none"
            stroke="#7AE6FF"
            strokeWidth="0.8"
            opacity="0.45"
          />
          {/* stage marker (top arc) */}
          <path
            d="M 65 38 Q 90 22 115 38"
            fill="none"
            stroke="#FF7BD4"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <text
            x="90"
            y="56"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="7"
            fontWeight="800"
            letterSpacing="2"
            fill="#FF7BD4"
            textAnchor="middle"
          >
            STAGE
          </text>
          {/* GA pit dots */}
          <g opacity="0.55">
            {[0, 1, 2, 3, 4].map((rowNum) =>
              [-2, -1, 0, 1, 2].map((colNum) => (
                <circle
                  key={`${rowNum}-${colNum}`}
                  cx={90 + colNum * 12}
                  cy={88 + rowNum * 11}
                  r="1.4"
                  fill="#7AE6FF"
                />
              )),
            )}
          </g>
          {/* compass — n marker */}
          <g transform="translate(90 158)">
            <circle
              r="5.5"
              fill="rgba(0,0,0,0.3)"
              stroke="#FFE36B"
              strokeWidth="1"
            />
            <text
              x="0"
              y="2"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="6"
              fontWeight="800"
              letterSpacing="0.5"
              fill="#FFE36B"
              textAnchor="middle"
            >
              N
            </text>
          </g>
        </svg>
        {/* venue label overlay */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -28,
            transform: 'translateX(-50%)',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '2px',
              marginBottom: 2,
            }}
          >
            FIRST TIME AT
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 17,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              textShadow: '0 1px 6px rgba(0,0,0,0.8)',
            }}
          >
            THE GOTHIC
          </div>
        </div>
      </div>

      {/* LEFT chip stack */}
      <div
        style={{
          position: 'absolute',
          left: 22,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          alignItems: 'flex-start',
          zIndex: 4,
        }}
      >
        {leftChips.map((chip, chipIdx) => (
          <FirstTimerChip key={chipIdx} chip={chip} side="left" />
        ))}
      </div>

      {/* RIGHT chip stack */}
      <div
        style={{
          position: 'absolute',
          right: 22,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          alignItems: 'flex-end',
          zIndex: 4,
        }}
      >
        {rightChips.map((chip, chipIdx) => (
          <FirstTimerChip key={chipIdx} chip={chip} side="right" />
        ))}
      </div>

      <ShowtimeEyebrow dotHue="#7AE6FF">{COPY.heroes.firstTimer.eyebrow}</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 12 · LAST TIME IN DENVER · Showtime
// ════════════════════════════════════════════════════════════════
interface VisitDot {
  date: string
  venue: string
  current?: boolean
}

export function LastTimeShowtime(): React.ReactElement {
  const visits: VisitDot[] = [
    { date: "MAR '24", venue: 'GOTHIC' },
    { date: "NOV '24", venue: 'MISSION' },
    { date: 'TONIGHT', venue: 'OGDEN', current: true },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <ShowtimeBackdrop founderGlow={false} />

      {/* POLAROID — left, the recalled visit */}
      <div
        style={
          {
            position: 'absolute',
            left: 56,
            top: '50%',
            width: 168,
            height: 200,
            marginTop: -110,
            ['--pc-sx' as string]: '-40px',
            ['--pc-sy' as string]: '-180px',
            ['--pc-srot' as string]: '-18deg',
            ['--pc-tx' as string]: '0px',
            ['--pc-rot' as string]: '-4deg',
            transform: 'rotate(-4deg)',
            transformOrigin: 'center center',
            animation:
              'pc2StubDealVaried 850ms 0.20s cubic-bezier(.2,.85,.2,1) both, pc2StubBreathe 5s 2s ease-in-out infinite',
            zIndex: 4,
            filter:
              'drop-shadow(0 16px 28px rgba(0,0,0,0.60)) drop-shadow(0 0 18px rgba(160,117,255,0.25))',
          } as React.CSSProperties
        }
      >
        {/* paper card */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#F4EFE3',
            borderRadius: 3,
            padding: '10px 10px 0',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
          }}
        >
          {/* riso art panel — rings treatment in violet/pink */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              background: '#2A1A2A',
              overflow: 'hidden',
            }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
              }}
            >
              <g transform="translate(3 3)" style={{ mixBlendMode: 'screen' }}>
                {[44, 34, 24, 14].map((radius, ringIdx) => (
                  <circle
                    key={`secondary-${ringIdx}`}
                    cx="58"
                    cy="42"
                    r={radius}
                    fill="none"
                    stroke="#FF7BD4"
                    strokeWidth="3"
                    opacity="0.72"
                  />
                ))}
              </g>
              <g style={{ mixBlendMode: 'screen' }}>
                {[44, 34, 24, 14].map((radius, ringIdx) => (
                  <circle
                    key={`primary-${ringIdx}`}
                    cx="58"
                    cy="42"
                    r={radius}
                    fill="none"
                    stroke="#A075FF"
                    strokeWidth="3"
                    opacity="0.85"
                  />
                ))}
              </g>
            </svg>
            {/* mono band caption inside art — distance / 'years ago' */}
            <div
              style={{
                position: 'absolute',
                left: 8,
                top: 8,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7.5,
                fontWeight: 800,
                color: '#FFE36B',
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                padding: '2px 6px',
                background: 'rgba(0,0,0,0.55)',
                borderRadius: 2,
              }}
            >
              1 yr ago
            </div>
          </div>
          {/* paper margin under photo — polaroid signature */}
          <div
            style={{
              padding: '10px 4px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: 900,
                color: '#15131A',
                letterSpacing: '-0.03em',
                lineHeight: 1,
              }}
            >
              Gothic Theatre
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8.5,
                fontWeight: 800,
                color: '#6B5E78',
                letterSpacing: '1.6px',
                textTransform: 'uppercase',
              }}
            >
              Mar 15 · 2024
            </div>
          </div>
        </div>
        {/* tape strip top-left for analog feel */}
        <div
          style={{
            position: 'absolute',
            left: -12,
            top: 14,
            width: 48,
            height: 16,
            background: 'rgba(255,227,107,0.55)',
            border: '1px solid rgba(255,227,107,0.7)',
            transform: 'rotate(-22deg)',
            mixBlendMode: 'screen',
          }}
        />
      </div>

      {/* RIGHT: artist + tonight plate */}
      <div
        style={{
          position: 'absolute',
          right: 36,
          top: '50%',
          marginTop: -100,
          width: 240,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          opacity: 0,
          animation: 'pc2EyebrowEnter 750ms 0.55s ease-out both',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '1.8px',
            textTransform: 'uppercase',
          }}
        >
          Big Thief · in Denver
        </div>

        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 30,
            fontWeight: 900,
            color: 'rgba(255,255,255,0.96)',
            letterSpacing: '-0.04em',
            lineHeight: 0.95,
            marginTop: 2,
          }}
        >
          2 visits
          <br />+ tonight
        </div>

        {/* divider */}
        <div
          style={{
            height: 1,
            marginTop: 10,
            marginBottom: 6,
            background:
              'linear-gradient(to right, rgba(122,230,255,0.50), transparent)',
          }}
        />

        <div
          style={
            {
              padding: '9px 12px',
              background: 'rgba(122,230,255,0.06)',
              border: '1.5px solid #7AE6FF',
              borderRadius: 4,
              boxShadow: '0 0 18px rgba(122,230,255,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              animation: 'pc2StubBreathe 5s 1.6s ease-in-out infinite',
              ['--pc-rot' as string]: '0deg',
              ['--pc-tx' as string]: '0px',
            } as React.CSSProperties
          }
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 800,
              color: '#7AE6FF',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
            }}
          >
            Tonight · visit 3
          </div>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 17,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
            }}
          >
            Ogden Theatre
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '1.4px',
            }}
          >
            AUG 18 · DOORS 8 PM
          </div>
        </div>
      </div>

      {/* DOT TRAIL — thin timeline across the bottom */}
      <div
        style={{
          position: 'absolute',
          left: 50,
          right: 50,
          bottom: 26,
          display: 'grid',
          gridTemplateColumns: `repeat(${visits.length}, 1fr)`,
          alignItems: 'center',
          zIndex: 3,
        }}
      >
        {/* underline */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 1,
            background:
              'linear-gradient(to right, transparent, rgba(255,255,255,0.18) 10%, rgba(255,255,255,0.18) 90%, transparent)',
            opacity: 0,
            animation: 'pc2EyebrowEnter 800ms 0.9s ease-out both',
          }}
        />
        {visits.map((visit, visitIdx) => (
          <div
            key={visitIdx}
            style={{
              position: 'relative',
              textAlign: 'center',
              opacity: 0,
              animation: `pc2EyebrowEnter 600ms ${1.0 + visitIdx * 0.16}s ease-out both`,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: visit.current ? 8 : 5,
                height: visit.current ? 8 : 5,
                borderRadius: '50%',
                background: visit.current
                  ? '#7AE6FF'
                  : 'rgba(255,255,255,0.55)',
                boxShadow: visit.current ? '0 0 10px #7AE6FF' : 'none',
                animation: visit.current
                  ? 'pc2Pulse 1.6s ease-in-out infinite'
                  : 'none',
              }}
            />
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7.5,
                fontWeight: 800,
                color: visit.current ? '#7AE6FF' : 'rgba(255,255,255,0.50)',
                letterSpacing: '1.4px',
                marginTop: 4,
              }}
            >
              {visit.date}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7,
                fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                letterSpacing: '1.2px',
                marginTop: 1,
              }}
            >
              {visit.venue}
            </div>
          </div>
        ))}
      </div>

      <ShowtimeEyebrow dotHue="#A075FF">{COPY.heroes.lastTime.eyebrow}</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 13 · SUPPORT ACT SPOTLIGHT · Showtime
// ════════════════════════════════════════════════════════════════
interface PosterPalette {
  bg: string
  primary: string
  secondary: string
}

interface ArtistPosterCardProps {
  band: string
  role: string
  palette: PosterPalette
  artStyle: 'stripes' | 'rings'
  size: 'small' | 'large'
  highlight?: boolean
}

function ArtistPosterCard({
  band,
  role,
  palette,
  artStyle,
  size,
  highlight = false,
}: ArtistPosterCardProps): React.ReactElement {
  const cardWidth = size === 'large' ? 160 : 120
  const cardHeight = size === 'large' ? 220 : 170
  return (
    <div
      style={{
        position: 'relative',
        width: cardWidth,
        height: cardHeight,
        borderRadius: 8,
        background: palette.bg,
        border: highlight
          ? '1.5px solid rgba(255,255,255,0.22)'
          : '1px solid rgba(255,255,255,0.10)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* art region */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {artStyle === 'stripes' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            {[0, 1, 2, 3, 4].map((stripeIdx) => (
              <div
                key={stripeIdx}
                style={{
                  flex: 1,
                  background:
                    stripeIdx % 2 === 0 ? palette.primary : palette.secondary,
                  opacity: 0.88,
                  marginRight: stripeIdx < 4 ? 1 : 0,
                  transform:
                    stripeIdx % 2 === 0
                      ? 'translateY(-3px)'
                      : 'translateY(3px)',
                  mixBlendMode: 'screen',
                }}
              />
            ))}
          </div>
        )}
        {artStyle === 'rings' && (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          >
            <g transform="translate(3 3)" style={{ mixBlendMode: 'screen' }}>
              {[44, 34, 24, 14].map((radius, ringIdx) => (
                <circle
                  key={`secondary-${ringIdx}`}
                  cx="50"
                  cy="44"
                  r={radius}
                  fill="none"
                  stroke={palette.secondary}
                  strokeWidth="3"
                  opacity="0.7"
                />
              ))}
            </g>
            <g style={{ mixBlendMode: 'screen' }}>
              {[44, 34, 24, 14].map((radius, ringIdx) => (
                <circle
                  key={`primary-${ringIdx}`}
                  cx="50"
                  cy="44"
                  r={radius}
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="3"
                  opacity="0.85"
                />
              ))}
            </g>
          </svg>
        )}
      </div>
      {/* label */}
      <div
        style={{
          background: palette.bg,
          padding: size === 'large' ? '10px 13px 12px' : '7px 10px 9px',
          borderTop: `1.5px solid ${palette.primary}`,
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: size === 'large' ? 15 : 11.5,
            fontWeight: 900,
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            marginBottom: 4,
          }}
        >
          {band}
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: size === 'large' ? 8 : 7,
            fontWeight: 800,
            color: palette.primary,
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
          }}
        >
          {role}
        </div>
      </div>
    </div>
  )
}

export function SupportActShowtime(): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <ShowtimeBackdrop founderGlow={false} />

      {/* central spotlight halo — points at the opener */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 320,
          height: 320,
          marginLeft: -120,
          marginTop: -160,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,227,107,0.20) 0%, rgba(122,230,255,0.10) 35%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* HEADLINER — back, slightly right of centre */}
      <div
        style={
          {
            position: 'absolute',
            left: 300,
            top: '50%',
            marginTop: -85,
            ['--p2-tx' as string]: '0px',
            ['--p2-rot' as string]: '5deg',
            opacity: 0,
            animation: 'p2CardDeal 720ms 0.2s cubic-bezier(.2,.85,.2,1) both',
            zIndex: 4,
            filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.55))',
          } as React.CSSProperties
        }
      >
        <ArtistPosterCard
          band="Bon Iver"
          role={COPY.heroes.supportAct.headlinerRole}
          palette={{ bg: '#1A2A30', primary: '#5DD4D6', secondary: '#FFB838' }}
          artStyle="stripes"
          size="small"
        />
      </div>

      {/* OPENER — front, slightly left of centre, overlapping the headliner */}
      <div
        style={
          {
            position: 'absolute',
            left: 140,
            top: '50%',
            marginTop: -110,
            ['--p2-tx' as string]: '0px',
            ['--p2-rot' as string]: '-3deg',
            opacity: 0,
            animation:
              'p2CardDeal 800ms 0.6s cubic-bezier(.2,.85,.2,1) both, p2OpenerLift 4.5s 1.7s ease-in-out infinite',
            zIndex: 8,
            filter:
              'drop-shadow(0 18px 28px rgba(0,0,0,0.6)) drop-shadow(0 0 22px rgba(255,227,107,0.40))',
          } as React.CSSProperties
        }
      >
        <ArtistPosterCard
          band="Soccer Mommy"
          role={COPY.heroes.supportAct.openerRole}
          palette={{ bg: '#2A1A1A', primary: '#FFE36B', secondary: '#FF7BD4' }}
          artStyle="rings"
          size="large"
          highlight
        />
      </div>

      {/* mono caption strip — bottom-centre */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 18,
          transform: 'translateX(-50%)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          fontWeight: 800,
          color: 'rgba(255,255,255,0.6)',
          letterSpacing: '1.8px',
          textTransform: 'uppercase',
          opacity: 0,
          animation: 'pc2EyebrowEnter 700ms 1.4s ease-out both',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: '#FFE36B' }}>Mission Ballroom</span>
        &nbsp;·&nbsp;{COPY.heroes.supportAct.newToYouSuffix}
      </div>

      <ShowtimeEyebrow dotHue="#FFE36B">{COPY.heroes.supportAct.eyebrow}</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// 15 · VENUE PASSPORT CARD · Showtime (paired with #14 Concert Passport)
// ════════════════════════════════════════════════════════════════
interface MiniStamp {
  accent: string
  glyph: string
  delay: number
  mrot: number
}

export function VenuePassportShowtime(): React.ReactElement {
  const accents = [
    '#FF7BD4',
    '#7AE6FF',
    '#FFE36B',
    '#A075FF',
    '#C9F26E',
    '#FFB838',
    '#5DD4D6',
  ]
  const glyphs = ['★', '○', '△', '◆', '+', '✦', '⭡']

  const stamps: MiniStamp[] = Array.from({ length: 10 }).map((_, stampIdx) => ({
    accent: accents[stampIdx % accents.length] ?? '#7AE6FF',
    glyph: glyphs[stampIdx % glyphs.length] ?? '★',
    delay: 0.85 + stampIdx * 0.13,
    mrot: ((stampIdx * 41) % 11) - 5,
  }))

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
        fontFamily: 'Inter, system-ui',
      }}
    >
      <ShowtimeBackdrop founderGlow={false} />

      {/* radial halo behind card */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 360,
          height: 360,
          marginLeft: -180,
          marginTop: -180,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,123,212,0.22) 0%, rgba(122,230,255,0.10) 35%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* one big passport card */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 420,
          height: 220,
          transform: 'translate(-50%, -50%) rotate(-2deg) scale(.9)',
          opacity: 0,
          animation: 'p2PassportIn 800ms 0.2s cubic-bezier(.2,.85,.2,1) both',
          borderRadius: 10,
          background: 'linear-gradient(135deg, #1A0E26 0%, #0F0A1A 100%)',
          border: '1.5px solid rgba(255,123,212,0.42)',
          boxShadow:
            '0 22px 44px rgba(0,0,0,0.65), 0 0 36px rgba(255,123,212,0.30), inset 0 0 0 1px rgba(255,255,255,0.04)',
          padding: '18px 22px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          zIndex: 5,
        }}
      >
        {/* left column: venue heading */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8.5,
                fontWeight: 800,
                color: '#FF7BD4',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Venue Passport · 04
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 30,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.97)',
                letterSpacing: '-0.04em',
                lineHeight: 0.95,
                textShadow: '0 1px 8px rgba(0,0,0,0.6)',
              }}
            >
              RED ROCKS
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: '1.6px',
                textTransform: 'uppercase',
                marginTop: 4,
              }}
            >
              Morrison · CO
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8.5,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                marginBottom: 3,
              }}
            >
              {COPY.heroes.venuePassport.nightsStamped}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 56,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  letterSpacing: '-0.05em',
                  lineHeight: 0.9,
                  textShadow: '0 0 22px rgba(255,123,212,0.40)',
                }}
              >
                8
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  fontWeight: 800,
                  color: '#7AE6FF',
                  letterSpacing: '1.6px',
                  textTransform: 'uppercase',
                }}
              >
                since &apos;22
              </span>
            </div>
          </div>
        </div>

        {/* right column: 5×2 mini-stamp grid */}
        <div
          style={{
            position: 'relative',
            padding: '6px 4px',
            borderLeft: '1px dashed rgba(255,123,212,0.30)',
            paddingLeft: 18,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {COPY.heroes.venuePassport.stampLedger}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              gap: 10,
              width: '100%',
            }}
          >
            {stamps.map((stamp, stampIdx) => (
              <div
                key={stampIdx}
                style={
                  {
                    width: 30,
                    height: 30,
                    position: 'relative',
                    opacity: 0,
                    transform: `scale(0) rotate(${stamp.mrot}deg)`,
                    ['--p2-mrot' as string]: `${stamp.mrot}deg`,
                    animation: `p2MiniStampIn 480ms ${stamp.delay}s cubic-bezier(.2,.85,.2,1) both`,
                  } as React.CSSProperties
                }
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    border: `1.5px solid ${stamp.accent}`,
                    background: 'rgba(0,0,0,0.35)',
                    boxShadow: `0 0 10px ${stamp.accent}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <StubGlyph
                    kind={stamp.glyph}
                    size={15}
                    color={stamp.accent}
                  />
                </div>
              </div>
            ))}
          </div>
          {/* tiny footer date */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7.5,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: '1.4px',
              textTransform: 'uppercase',
            }}
          >
            Aug 18 &apos;26
          </div>
        </div>

        {/* corner perforation hint */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: '1px dashed rgba(255,123,212,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7,
            fontWeight: 800,
            color: '#FF7BD4',
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            transform: 'rotate(-8deg)',
            pointerEvents: 'none',
          }}
        >
          {COPY.heroes.venuePassport.stampedBadge}
        </div>
      </div>

      <ShowtimeEyebrow dotHue="#FF7BD4">{COPY.heroes.venuePassport.eyebrow}</ShowtimeEyebrow>
    </div>
  )
}

// Re-export ShowtimeSparkles so consumers of this barrel don't need a separate import
export { ShowtimeSparkles }
