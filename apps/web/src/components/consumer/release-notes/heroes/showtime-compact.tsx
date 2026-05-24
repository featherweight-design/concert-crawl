'use client'

import React from 'react'
import {
  ShowtimeBackdrop,
  ShowtimeEyebrow,
  ShowtimeSparkles,
  StubGlyph,
  ShowtimeStub,
  useShowtimeKeyframes,
} from './showtime-base'

// ── Shared compact stage ─────────────────────────────────────────────────────
// 200×132 strip backdrop: dark cinematic base + two contained color washes +
// optional founder glow + compact mono eyebrow.
// Keyframes (cmpBgShift, cmpFadeIn, cmpScaleIn, cmpPulse, cmpBreathe,
// cmpEqWave, cmpPing, cmpStampIn, cmpRing, cmpSparkle, cmpStubDeal,
// cmpArrowFall) are injected by showtime-base.tsx — do NOT redefine here.

interface CompactStageProps {
  children?: React.ReactNode
  eyebrow?: string
  eyebrowHue?: string
  founderGlow?: boolean
}

export function CompactStage({
  children,
  eyebrow,
  eyebrowHue = '#7AE6FF',
  founderGlow,
}: CompactStageProps): React.ReactElement {
  useShowtimeKeyframes()
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
        fontFamily: 'Inter, system-ui',
      }}
    >
      {/* compact washes — smaller, contained */}
      <div
        style={{
          position: 'absolute',
          right: -30,
          top: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,184,56,0.22) 0%, transparent 65%)',
          animation: 'cmpBgShift 10s ease-in-out infinite',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -40,
          bottom: -50,
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(122,230,255,0.20) 0%, transparent 65%)',
          animation: 'cmpBgShift 12s 1s ease-in-out infinite',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      {founderGlow && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 120,
            height: 120,
            marginLeft: -60,
            marginTop: -60,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,227,107,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {children}

      {eyebrow && (
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 8,
            zIndex: 30,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.92)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            whiteSpace: 'nowrap',
            opacity: 0,
            animation: 'cmpFadeIn 600ms 0.1s ease-out both',
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: 4,
              background: eyebrowHue,
              boxShadow: `0 0 4px ${eyebrowHue}`,
              animation: 'cmpPulse 1.6s ease-in-out infinite',
            }}
          />
          {eyebrow}
        </div>
      )}
    </div>
  )
}

// ── Compact eyebrow (standalone, for use outside CompactStage) ───────────────

interface CompactEyebrowProps {
  children: React.ReactNode
  dotHue?: string
}

export function CompactEyebrow({
  children,
  dotHue = '#7AE6FF',
}: CompactEyebrowProps): React.ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        left: 10,
        top: 8,
        zIndex: 30,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 7,
        fontWeight: 800,
        color: 'rgba(255,255,255,0.92)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        whiteSpace: 'nowrap',
        opacity: 0,
        animation: 'cmpFadeIn 600ms 0.1s ease-out both',
      }}
    >
      <span
        style={{
          width: 4,
          height: 4,
          borderRadius: 4,
          background: dotHue,
          boxShadow: `0 0 4px ${dotHue}`,
          animation: 'cmpPulse 1.6s ease-in-out infinite',
        }}
      />
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PRIORITY-1 COMPACTS
// ════════════════════════════════════════════════════════════════════════════

// 1 · Submit a Price — verified pill
export function PricesCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Crowd-sourced" eyebrowHue="#7AE6FF">
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          opacity: 0,
          animation: 'cmpFadeIn 600ms 0.2s ease-out both',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          Face value
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 44,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            textShadow: '0 0 20px rgba(122,230,255,0.55)',
          }}
        >
          $48
        </div>
        <div
          style={{
            marginTop: 5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            border: '1.4px solid #7AE6FF',
            borderRadius: 999,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7,
            fontWeight: 800,
            color: '#7AE6FF',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
            <path
              d="M2 6 L5 9 L10 3"
              stroke="#7AE6FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Verified
        </div>
      </div>
    </CompactStage>
  )
}

// 2 · Tier badges — single Founder medallion
export function TiersCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Founder" eyebrowHue="#7AE6FF" founderGlow>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '48%',
          ['--cmp-base' as string]: 'translate(-50%, -50%)',
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          animation: 'cmpScaleIn 700ms 0.2s cubic-bezier(.2,.85,.2,1) both',
          filter:
            'drop-shadow(0 8px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(122,230,255,0.45))',
        } as React.CSSProperties}
      >
        <div style={{ position: 'relative', width: 78, height: 78 }}>
          <svg width="78" height="78" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="cmp-founder-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7AE6FF" />
                <stop offset="100%" stopColor="#FF7BD4" />
              </linearGradient>
            </defs>
            <circle
              cx="60"
              cy="60"
              r="57"
              fill="rgba(255,255,255,0.05)"
              stroke="url(#cmp-founder-ring)"
              strokeWidth="3"
            />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="#7AE6FF"
              strokeWidth="0.7"
              opacity="0.45"
            />
          </svg>
          {/* crown glyph */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24">
              <path
                d="M3 17 L3 7.5 L7.5 13 L12 4 L16.5 13 L21 7.5 L21 17 Z"
                fill="#7AE6FF"
                stroke="#FF7BD4"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
              <rect x="3" y="17.5" width="18" height="2.6" rx="0.5" fill="#7AE6FF" />
              <circle cx="7.5" cy="11.2" r="0.95" fill="#FF7BD4" />
              <circle cx="12" cy="6.5" r="0.95" fill="#FF7BD4" />
              <circle cx="16.5" cy="11.2" r="0.95" fill="#FF7BD4" />
            </svg>
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 12,
          transform: 'translateX(-50%)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7,
          fontWeight: 800,
          color: '#FF7BD4',
          letterSpacing: '0.20em',
          textTransform: 'uppercase',
          opacity: 0,
          animation: 'cmpFadeIn 500ms 0.65s ease-out both',
        }}
      >
        First 100 only
      </div>
    </CompactStage>
  )
}

// 3 · History — single hero stub + counter
export function HistoryCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Concert history" eyebrowHue="#7AE6FF">
      {/* big counter */}
      <div
        style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0,
          animation: 'cmpFadeIn 600ms 0.3s ease-out both',
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 42,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            textShadow: '0 0 16px rgba(122,230,255,0.40)',
          }}
        >
          34
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7,
            fontWeight: 800,
            color: '#7AE6FF',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          Nights kept
        </div>
      </div>
      {/* tonight stub miniature */}
      <div
        style={
          {
            position: 'absolute',
            right: -16,
            top: '50%',
            marginTop: -28,
            width: 110,
            height: 65,
            ['--cmp-base']: 'rotate(-2deg)',
            transform: 'rotate(-2deg)',
            opacity: 0,
            animation: 'cmpStubDeal 700ms 0.5s cubic-bezier(.2,.85,.2,1) both',
            ['--cmp-sx']: '20px',
            ['--cmp-sy']: '-30px',
            ['--cmp-srot']: '-10deg',
            ['--cmp-rot']: '-2deg',
            filter:
              'drop-shadow(0 6px 10px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(122,230,255,0.35))',
          } as React.CSSProperties
        }
      >
        <svg width="110" height="65" viewBox="0 0 220 130">
          <path
            d="M0 12 Q0 0 12 0 L162 0 L162 130 L12 130 Q0 130 0 118 Z"
            fill="#0C0A14"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />
          <path
            d="M170 0 L208 0 Q220 0 220 12 L220 118 Q220 130 208 130 L170 130 Z"
            fill="#0C0A14"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
          />
          <circle cx="40" cy="65" r="30" fill="none" stroke="#7AE6FF" strokeWidth="2.5" />
          <text
            x="88"
            y="36"
            fontFamily="Inter, sans-serif"
            fontSize="22"
            fontWeight="900"
            fill="rgba(255,255,255,0.95)"
            letterSpacing="-0.04em"
          >
            TONIGHT
          </text>
          <text
            x="88"
            y="60"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            fontWeight="800"
            letterSpacing="2"
            fill="#7AE6FF"
          >
            ADMIT ONE
          </text>
          <line
            x1="166"
            y1="6"
            x2="166"
            y2="124"
            stroke="#7AE6FF"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: `${(40 / 220) * 100}%`,
            top: `${(65 / 130) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <StubGlyph kind="★" size={22} color="#7AE6FF" />
        </div>
      </div>
    </CompactStage>
  )
}

// 4 · Calendar — mini calendar grid with one stamp
export function CalendarCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Jun 2026" eyebrowHue="#7AE6FF">
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '54%',
          transform: 'translate(-50%, -50%)',
          opacity: 0,
          animation: 'cmpFadeIn 600ms 0.2s ease-out both',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 17px)',
            gridTemplateRows: 'repeat(4, 17px)',
            gap: 2,
          }}
        >
          {Array.from({ length: 28 }).map((_, idx) => {
            const date = idx + 1
            const isStamp = date === 14
            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  width: 17,
                  height: 17,
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: isStamp ? 'rgba(255,255,255,0.04)' : 'transparent',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 1,
                    left: 2,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 5.5,
                    fontWeight: 700,
                    color: isStamp ? '#7AE6FF' : 'rgba(255,255,255,0.30)',
                  }}
                >
                  {date}
                </span>
                {isStamp && (
                  <div
                    style={
                      {
                        position: 'absolute',
                        left: '50%',
                        top: '60%',
                        width: 13,
                        height: 13,
                        marginLeft: -6.5,
                        marginTop: -6.5,
                        borderRadius: '50%',
                        border: '1.2px solid #7AE6FF',
                        background: 'rgba(0,0,0,0.5)',
                        boxShadow: '0 0 8px #7AE6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation:
                          'cmpStampIn 460ms 0.7s cubic-bezier(.2,.85,.2,1) both, cmpPulse 3s 1.4s ease-in-out infinite',
                        ['--cmp-rot']: '0deg',
                      } as React.CSSProperties
                    }
                  >
                    <StubGlyph kind="★" size={8} color="#7AE6FF" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </CompactStage>
  )
}

// 5 · Shareable — single poster card
export function ShareCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Share card" eyebrowHue="#FF7BD4">
      <div
        style={
          {
            position: 'absolute',
            left: '50%',
            top: '52%',
            ['--cmp-base']: 'translate(-50%, -50%) rotate(-2deg)',
            transform: 'translate(-50%, -50%) rotate(-2deg)',
            width: 72,
            height: 100,
            borderRadius: 4,
            background: '#0C0A14',
            border: '1.5px solid rgba(255,255,255,0.18)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            opacity: 0,
            animation:
              'cmpScaleIn 700ms 0.2s cubic-bezier(.2,.85,.2,1) both, cmpBreathe 5s 1.5s ease-in-out infinite',
            filter:
              'drop-shadow(0 10px 16px rgba(0,0,0,0.55)) drop-shadow(0 0 16px rgba(122,230,255,0.30))',
          } as React.CSSProperties
        }
      >
        {/* halftone art */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              left: '-30%',
              bottom: '-25%',
              width: '115%',
              height: '115%',
              borderRadius: '50%',
              background: '#7AE6FF',
              mixBlendMode: 'screen',
              opacity: 0.8,
            }}
          />
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' }}
          >
            {Array.from({ length: 24 }).map((_, idx) => {
              const col = idx % 6
              const row = Math.floor(idx / 4)
              const xPos = col * 16 + 8
              const yPos = row * 16 + 6
              const dist = Math.sqrt((5 - col) ** 2 + row ** 2)
              const dotR = Math.max(0.8, 3.4 - dist * 0.5)
              return (
                <circle key={idx} cx={xPos} cy={yPos} r={dotR} fill="#FF7BD4" opacity="0.85" />
              )
            })}
          </svg>
        </div>
        <div
          style={{
            background: '#0C0A14',
            padding: '5px 7px 6px',
            borderTop: '1.2px solid #7AE6FF',
          }}
        >
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 9,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.96)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            wednesday
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 5.5,
              fontWeight: 800,
              color: '#7AE6FF',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            OGDEN · JUN 14
          </div>
        </div>
      </div>
    </CompactStage>
  )
}

// 6 · Watchers — big count + 2 rings
export function WatchersCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Watching now" eyebrowHue="#7AE6FF">
      {/* 2 rings */}
      {[0, 1.0].map((delay, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            left: '50%',
            top: '52%',
            width: 130,
            height: 130,
            borderRadius: '50%',
            border: '1.6px solid #7AE6FF',
            opacity: 0,
            transform: 'translate(-50%, -50%) scale(0.18)',
            animation: `cmpRing 2.8s ${delay}s ease-out infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          opacity: 0,
          animation: 'cmpFadeIn 600ms 0.3s ease-out both',
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 46,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            textShadow: '0 0 18px rgba(122,230,255,0.55)',
          }}
        >
          312
        </div>
      </div>
    </CompactStage>
  )
}

// 7 · Spotify — mini EQ + count
export function SpotifyCompact(): React.ReactElement {
  const bars = Array.from({ length: 10 }).map((_, idx) => {
    const minVal = 0.22 + Math.abs(Math.sin(idx * 0.8) * 0.18)
    const maxVal = 0.60 + Math.abs(Math.sin(idx * 0.6 + 1) * 0.40)
    const dur = 1.8 + Math.abs(Math.sin(idx * 0.42) * 1.3)
    return { min: minVal, max: maxVal, dur, offset: -idx * 0.18 }
  })

  return (
    <CompactStage eyebrow="Spotify sync" eyebrowHue="#FF7BD4">
      {/* counter */}
      <div
        style={{
          position: 'absolute',
          right: 12,
          top: 26,
          textAlign: 'right',
          opacity: 0,
          animation: 'cmpFadeIn 500ms 0.6s ease-out both',
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 28,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            textShadow: '0 0 12px rgba(255,123,212,0.40)',
          }}
        >
          34
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 6,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          Artists
        </div>
      </div>
      {/* bars */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          height: 70,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 4,
          opacity: 0,
          animation: 'cmpFadeIn 500ms 0.2s ease-out both',
        }}
      >
        {bars.map((bar, idx) => (
          <div
            key={idx}
            style={
              {
                flex: 1,
                maxWidth: 8,
                height: '100%',
                ['--cmp-eq-min']: String(bar.min),
                ['--cmp-eq-max']: String(bar.max),
                background: idx % 2 === 0 ? '#7AE6FF' : '#FF7BD4',
                borderRadius: '2px 2px 0 0',
                transformOrigin: 'bottom center',
                transform: `scaleY(${bar.min})`,
                animation: `cmpEqWave ${bar.dur}s ${bar.offset}s ease-in-out infinite alternate`,
                boxShadow:
                  idx % 2 === 0
                    ? '0 0 5px rgba(122,230,255,0.5)'
                    : '0 0 5px rgba(255,123,212,0.5)',
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </CompactStage>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// PRIORITY-2 COMPACTS
// ════════════════════════════════════════════════════════════════════════════

// 8 · Following — bell-glyph + 1 slow ping ring + artist wordmark
export function FollowingCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Following" eyebrowHue="#FF7BD4">
      {/* ping ring — centered on bell */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '48%',
          width: 92,
          height: 92,
          borderRadius: '50%',
          border: '1.4px solid #FF7BD4',
          opacity: 0,
          transform: 'translate(-50%, -50%) scale(0.4)',
          animation: 'cmpPing 3.4s ease-out infinite',
          pointerEvents: 'none',
        }}
      />
      {/* bell glyph centered — sized to leave room for wordmark below */}
      <div
        style={
          {
            position: 'absolute',
            left: '50%',
            top: '48%',
            ['--cmp-base']: 'translate(-50%, -50%)',
            transform: 'translate(-50%, -50%)',
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            border: '1.5px solid #FF7BD4',
            boxShadow: '0 0 18px rgba(255,123,212,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            animation: 'cmpScaleIn 600ms 0.25s cubic-bezier(.2,.85,.2,1) both',
          } as React.CSSProperties
        }
      >
        <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
          <path
            d="M5 16 L17 16 M5 16 Q5 7 11 5 Q17 7 17 16"
            stroke="#FF7BD4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="rgba(255,123,212,0.18)"
          />
          <circle cx="11" cy="19" r="1.4" fill="#FF7BD4" />
        </svg>
      </div>
      {/* artist wordmark — anchored to bottom */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 14,
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          fontSize: 10,
          fontWeight: 900,
          lineHeight: 1,
          color: 'rgba(255,255,255,0.95)',
          letterSpacing: '-0.01em',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'cmpFadeIn 500ms 0.6s ease-out both',
        }}
      >
        RUN THE JEWELS
      </div>
    </CompactStage>
  )
}

// 9 · Price Drop — old/new ticker
export function PriceDropCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Price drop" eyebrowHue="#C9F26E">
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          opacity: 0,
          animation: 'cmpFadeIn 600ms 0.2s ease-out both',
        }}
      >
        {/* old price */}
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            fontWeight: 900,
            color: 'rgba(255,255,255,0.50)',
            letterSpacing: '-0.03em',
            textDecoration: 'line-through',
            lineHeight: 1,
          }}
        >
          $120
        </div>
        {/* new price */}
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 40,
            fontWeight: 900,
            color: '#C9F26E',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            marginTop: 2,
            textShadow: '0 0 16px rgba(201,242,110,0.45)',
          }}
        >
          $48
        </div>
        {/* SAVED chip */}
        <div
          style={{
            marginTop: 6,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 7px',
            border: '1.2px solid #C9F26E',
            borderRadius: 999,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7,
            fontWeight: 800,
            color: '#C9F26E',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ fontSize: 8 }}>↓</span> Saved $72
        </div>
      </div>
      {/* falling arrow accent on right */}
      <svg
        width="14"
        height="10"
        viewBox="0 0 14 10"
        style={{
          position: 'absolute',
          right: 18,
          top: '44%',
          opacity: 0,
          animation: 'cmpArrowFall 2.0s 0.8s ease-in-out infinite',
        }}
      >
        <path
          d="M2 2 L7 7 L12 2"
          fill="none"
          stroke="#C9F26E"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </CompactStage>
  )
}

// 10 · Setlist — mini receipt with 3 lines
export function SetlistCompact(): React.ReactElement {
  const tracks = [
    { num: '01', barWidth: 86, debut: false },
    { num: '02', barWidth: 70, debut: false },
    { num: '03', barWidth: 92, debut: true },
  ]

  return (
    <CompactStage eyebrow="Setlist" eyebrowHue="#7AE6FF">
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '54%',
          transform: 'translate(-50%, -50%)',
          width: 152,
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 4,
          boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
          opacity: 0,
          animation: 'cmpFadeIn 600ms 0.2s ease-out both',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            paddingBottom: 4,
            borderBottom: '1px dashed rgba(255,255,255,0.20)',
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 10,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.96)',
              letterSpacing: '-0.02em',
            }}
          >
            SETLIST
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7,
              fontWeight: 800,
              color: '#7AE6FF',
              letterSpacing: '0.10em',
            }}
          >
            5 / 14
          </div>
        </div>
        {/* mini track lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tracks.map((track, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px 1fr',
                gap: 8,
                alignItems: 'center',
                opacity: 0,
                animation: `cmpFadeIn 400ms ${0.5 + idx * 0.15}s ease-out both`,
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 7,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.42)',
                }}
              >
                {track.num}
              </span>
              <span
                style={{
                  height: 4,
                  width: track.barWidth,
                  background: track.debut ? '#FFE36B' : 'rgba(255,255,255,0.30)',
                  borderRadius: 1,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </CompactStage>
  )
}

// 11 · First-Timer — venue plate with seating diagram
export function FirstTimerCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="First-Timer" eyebrowHue="#7AE6FF">
      <div
        style={
          {
            position: 'absolute',
            left: '50%',
            top: '42%',
            ['--cmp-base']: 'translate(-50%, -50%)',
            transform: 'translate(-50%, -50%)',
            opacity: 0,
            animation: 'cmpScaleIn 600ms 0.2s cubic-bezier(.2,.85,.2,1) both',
            filter:
              'drop-shadow(0 6px 12px rgba(0,0,0,0.55)) drop-shadow(0 0 14px rgba(122,230,255,0.30))',
          } as React.CSSProperties
        }
      >
        <svg width="78" height="78" viewBox="0 0 180 180" style={{ display: 'block' }}>
          <polygon
            points="44,8 136,8 172,44 172,136 136,172 44,172 8,136 8,44"
            fill="rgba(255,255,255,0.04)"
            stroke="#7AE6FF"
            strokeWidth="2.6"
            opacity="0.92"
          />
          <polygon
            points="58,28 122,28 152,58 152,122 122,152 58,152 28,122 28,58"
            fill="none"
            stroke="#7AE6FF"
            strokeWidth="1.2"
            opacity="0.5"
          />
          {/* stage arc + label */}
          <path
            d="M 60 36 Q 90 18 120 36"
            fill="none"
            stroke="#FF7BD4"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <text
            x="90"
            y="56"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            fontWeight="800"
            letterSpacing="2.4"
            fill="#FF7BD4"
            textAnchor="middle"
          >
            STAGE
          </text>
          {/* GA pit dots */}
          <g opacity="0.65">
            {[0, 1, 2, 3].map((rowIdx) =>
              [-2, -1, 0, 1, 2].map((colIdx) => (
                <circle
                  key={`${rowIdx}-${colIdx}`}
                  cx={90 + colIdx * 15}
                  cy={94 + rowIdx * 14}
                  r="2.5"
                  fill="#7AE6FF"
                />
              )),
            )}
          </g>
        </svg>
      </div>
      {/* venue label — anchored to bottom */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 14,
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          fontWeight: 900,
          lineHeight: 1,
          color: 'rgba(255,255,255,0.95)',
          letterSpacing: '-0.01em',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
          opacity: 0,
          animation: 'cmpFadeIn 500ms 0.6s ease-out both',
        }}
      >
        THE GOTHIC
      </div>
    </CompactStage>
  )
}

// 12 · Last Time — single tilted polaroid
export function LastTimeCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Last time" eyebrowHue="#A075FF">
      <div
        style={
          {
            position: 'absolute',
            left: '50%',
            top: '52%',
            ['--cmp-base']: 'translate(-50%, -50%) rotate(-5deg)',
            transform: 'translate(-50%, -50%) rotate(-5deg)',
            width: 80,
            height: 100,
            opacity: 0,
            animation:
              'cmpScaleIn 700ms 0.2s cubic-bezier(.2,.85,.2,1) both, cmpBreathe 5s 1.5s ease-in-out infinite',
            filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.6))',
          } as React.CSSProperties
        }
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#F4EFE3',
            borderRadius: 2,
            padding: '5px 5px 0',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* art panel */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              background: '#2A1A2A',
              overflow: 'hidden',
            }}
          >
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
              <g style={{ mixBlendMode: 'screen' }}>
                {[36, 26, 16].map((radius, idx) => (
                  <circle
                    key={idx}
                    cx="55"
                    cy="42"
                    r={radius}
                    fill="none"
                    stroke="#A075FF"
                    strokeWidth="3.5"
                    opacity="0.8"
                  />
                ))}
              </g>
              <g transform="translate(3 3)" style={{ mixBlendMode: 'screen' }}>
                {[36, 26, 16].map((radius, idx) => (
                  <circle
                    key={idx}
                    cx="55"
                    cy="42"
                    r={radius}
                    fill="none"
                    stroke="#FF7BD4"
                    strokeWidth="3.5"
                    opacity="0.7"
                  />
                ))}
              </g>
            </svg>
          </div>
          <div
            style={{
              padding: '4px 2px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 6,
              fontWeight: 800,
              color: '#15131A',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            FEB &apos;24
          </div>
        </div>
        {/* tape */}
        <div
          style={{
            position: 'absolute',
            left: -8,
            top: 6,
            width: 28,
            height: 9,
            background: 'rgba(255,227,107,0.65)',
            transform: 'rotate(-22deg)',
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </CompactStage>
  )
}

// 13 · Support Act — single opener card
export function SupportActCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Opening for" eyebrowHue="#FFE36B">
      <div
        style={
          {
            position: 'absolute',
            left: '50%',
            top: '52%',
            ['--cmp-base']: 'translate(-50%, -50%) rotate(-3deg)',
            transform: 'translate(-50%, -50%) rotate(-3deg)',
            width: 84,
            height: 116,
            opacity: 0,
            animation:
              'cmpScaleIn 700ms 0.2s cubic-bezier(.2,.85,.2,1) both, cmpBreathe 4.5s 1.7s ease-in-out infinite',
            filter:
              'drop-shadow(0 10px 16px rgba(0,0,0,0.6)) drop-shadow(0 0 14px rgba(255,227,107,0.35))',
            borderRadius: 5,
            overflow: 'hidden',
            background: '#2A1A1A',
            border: '1.5px solid rgba(255,255,255,0.18)',
            display: 'flex',
            flexDirection: 'column',
          } as React.CSSProperties
        }
      >
        {/* rings art */}
        <div style={{ flex: 1, position: 'relative' }}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            <g style={{ mixBlendMode: 'screen' }}>
              {[42, 30, 18].map((radius, idx) => (
                <circle
                  key={idx}
                  cx="50"
                  cy="44"
                  r={radius}
                  fill="none"
                  stroke="#FFE36B"
                  strokeWidth="3.5"
                  opacity="0.85"
                />
              ))}
            </g>
            <g transform="translate(3 3)" style={{ mixBlendMode: 'screen' }}>
              {[42, 30, 18].map((radius, idx) => (
                <circle
                  key={idx}
                  cx="50"
                  cy="44"
                  r={radius}
                  fill="none"
                  stroke="#FF7BD4"
                  strokeWidth="3.5"
                  opacity="0.65"
                />
              ))}
            </g>
          </svg>
        </div>
        {/* label */}
        <div
          style={{
            padding: '5px 7px 6px',
            borderTop: '1.5px solid #FFE36B',
          }}
        >
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 10,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.96)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            SOCCER MOMMY
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 6,
              fontWeight: 800,
              color: '#FFE36B',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            ★ Opener
          </div>
        </div>
      </div>
    </CompactStage>
  )
}

// ── Internal helper for PassportCompact ─────────────────────────────────────

interface MiniStubConfig {
  tx: number
  ty: number
  rot: number
  accent: string
  glyph: string
  top?: boolean
}

function MiniStub({ stubConfig }: { stubConfig: MiniStubConfig }): React.ReactElement {
  return (
    <div style={{ position: 'relative', width: 110, height: 65 }}>
      <svg width="110" height="65" viewBox="0 0 220 130">
        <path
          d="M0 12 Q0 0 12 0 L162 0 L162 130 L12 130 Q0 130 0 118 Z"
          fill={stubConfig.top ? '#0C0A14' : '#1A1626'}
          stroke={stubConfig.top ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}
          strokeWidth="1"
        />
        <path
          d="M170 0 L208 0 Q220 0 220 12 L220 118 Q220 130 208 130 L170 130 Z"
          fill={stubConfig.top ? '#0C0A14' : '#1A1626'}
          stroke={stubConfig.top ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}
          strokeWidth="1"
        />
        <circle
          cx="40"
          cy="65"
          r="30"
          fill="none"
          stroke={stubConfig.accent}
          strokeWidth="2.5"
          opacity={stubConfig.top ? 0.95 : 0.65}
        />
        <text
          x="88"
          y="34"
          fontFamily="Inter, sans-serif"
          fontSize="22"
          fontWeight="900"
          letterSpacing="-0.04em"
          fill={stubConfig.top ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)'}
        >
          {stubConfig.top ? 'TONIGHT' : 'ADMIT'}
        </text>
        <text
          x="88"
          y="58"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="10"
          fontWeight="800"
          letterSpacing="2"
          fill={stubConfig.accent}
          opacity={stubConfig.top ? 0.9 : 0.65}
        >
          ONE
        </text>
        <line
          x1="166"
          y1="6"
          x2="166"
          y2="124"
          stroke={stubConfig.accent}
          strokeWidth="1"
          strokeDasharray="3 4"
          opacity={stubConfig.top ? 0.55 : 0.40}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: `${(40 / 220) * 100}%`,
          top: `${(65 / 130) * 100}%`,
          transform: 'translate(-50%, -50%)',
          opacity: stubConfig.top ? 1 : 0.7,
        }}
      >
        <StubGlyph
          kind={stubConfig.glyph}
          size={stubConfig.top ? 22 : 18}
          color={stubConfig.accent}
        />
      </div>
    </div>
  )
}

// 14 · Concert Passport — 3 stubs fanned + sparkles (the marquee)
export function PassportCompact(): React.ReactElement {
  const stubs: Array<MiniStubConfig & { delay: number }> = [
    { tx: -38, ty: 10, rot: -14, delay: 0.30, accent: '#FF7BD4', glyph: '○' },
    { tx: 38, ty: 10, rot: 14, delay: 0.45, accent: '#A075FF', glyph: '◆' },
    { tx: 0, ty: -4, rot: 0, delay: 0.65, accent: '#7AE6FF', glyph: '★', top: true },
  ]
  // 6 sparkles — restrained but present
  const sparkles = Array.from({ length: 6 }).map((_, idx) => ({
    xPos: ((idx * 39) % 180) + 10,
    yPos: ((idx * 53) % 110) + 10,
    delay: (idx * 0.31) % 2.4,
    hue: ['#7AE6FF', '#FFE36B', '#FF7BD4', '#FFFFFF'][idx % 4],
  }))

  return (
    <CompactStage eyebrow="Passport" eyebrowHue="#FFE36B">
      {sparkles.map((sp, idx) => (
        <span
          key={idx}
          style={{
            position: 'absolute',
            left: sp.xPos,
            top: sp.yPos,
            width: 2,
            height: 2,
            borderRadius: '50%',
            background: sp.hue,
            boxShadow: `0 0 4px ${sp.hue}`,
            animation: `cmpSparkle 2.2s ${sp.delay}s ease-in-out infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
      {stubs.map((stub, idx) => (
        <div
          key={idx}
          style={
            {
              position: 'absolute',
              left: '50%',
              top: '52%',
              marginLeft: -55,
              marginTop: -32,
              ['--cmp-base']: `translate(${stub.tx}px, ${stub.ty}px)`,
              ['--cmp-sx']: '0px',
              ['--cmp-sy']: '-50px',
              ['--cmp-srot']: '0deg',
              ['--cmp-rot']: `${stub.rot}deg`,
              transform: `translate(${stub.tx}px, ${stub.ty}px) rotate(${stub.rot}deg)`,
              width: 110,
              height: 65,
              opacity: 0,
              animation: `cmpStubDeal 700ms ${stub.delay}s cubic-bezier(.2,.85,.2,1) both${stub.top ? ', cmpBreathe 4.5s 1.8s ease-in-out infinite' : ''}`,
              zIndex: stub.top ? 10 : idx,
              filter: stub.top
                ? `drop-shadow(0 8px 14px rgba(0,0,0,0.55)) drop-shadow(0 0 12px ${stub.accent}66)`
                : 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
            } as React.CSSProperties
          }
        >
          <MiniStub stubConfig={stub} />
        </div>
      ))}
    </CompactStage>
  )
}

// 15 · Venue Passport — single big stamp
export function VenuePassportCompact(): React.ReactElement {
  return (
    <CompactStage eyebrow="Venue passport" eyebrowHue="#FF7BD4">
      <div
        style={
          {
            position: 'absolute',
            left: '50%',
            top: '52%',
            ['--cmp-base']: 'translate(-50%, -50%) rotate(-3deg)',
            transform: 'translate(-50%, -50%) rotate(-3deg)',
            padding: '8px 14px',
            background: 'rgba(0,0,0,0.55)',
            border: '2px solid #FF7BD4',
            borderRadius: 4,
            boxShadow: '0 0 22px rgba(255,123,212,0.40), 0 8px 16px rgba(0,0,0,0.5)',
            textAlign: 'center',
            opacity: 0,
            animation: 'cmpStampIn 600ms 0.25s cubic-bezier(.2,.85,.2,1) both',
          } as React.CSSProperties
        }
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7.5,
            fontWeight: 800,
            color: '#FF7BD4',
            letterSpacing: '0.20em',
          }}
        >
          RED ROCKS
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 38,
            fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            textShadow: '0 0 16px rgba(255,123,212,0.45)',
          }}
        >
          8
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 6.5,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
          }}
        >
          nights · since &apos;22
        </div>
      </div>
    </CompactStage>
  )
}

// ── Compact lookup map (for dispatcher) ──────────────────────────────────────
// Maps hero key → compact component. Import this in SpotlightHero.tsx and
// use it to resolve <SpotlightHero hero="..." compact /> routes.
export const SPOTLIGHT_COMPACT_HEROES: Record<string, React.ComponentType> = {
  'price': PricesCompact,
  'tiers': TiersCompact,
  'history': HistoryCompact,
  'calendar': CalendarCompact,
  'share': ShareCompact,
  'watchers': WatchersCompact,
  'spotify': SpotifyCompact,
  'following': FollowingCompact,
  'price-drop': PriceDropCompact,
  'setlist': SetlistCompact,
  'first-timer': FirstTimerCompact,
  'last-time': LastTimeCompact,
  'support-act': SupportActCompact,
  'passport': PassportCompact,
  'venue-passport': VenuePassportCompact,
}

// Re-export ShowtimeBackdrop, ShowtimeEyebrow, ShowtimeSparkles, StubGlyph,
// ShowtimeStub so consumers only need to import from this file if they
// exclusively use the compact surface. Named imports are forwarded unchanged.
export { ShowtimeBackdrop, ShowtimeEyebrow, ShowtimeSparkles, StubGlyph, ShowtimeStub }
