'use client'
import React from 'react'
import {
  ShowtimeBackdrop,
  ShowtimeEyebrow,
  ShowtimeSparkles,
  StubGlyph,
  ShowtimeStub,
  TierGlyph,
} from './showtime-base'

// ════════════════════════════════════════════════════════════════
// Internal types
// ════════════════════════════════════════════════════════════════

interface TierDef {
  key: 'supporter' | 'premium' | 'founder'
  name: string
  priceText: string
  accent: string
  accent2?: string
  pos: { tx: number; rot: number }
  from: { sx: number; sy: number; srot: number }
  d: number
  founder?: boolean
}

interface StubDef {
  tx: number
  rot: number
  sx: number
  sy: number
  srot: number
  d: number
  accent: string
  glyph: string
  year: string
  current?: boolean
}

interface HistoryStubProps {
  s: StubDef
}

interface ShowDateDef {
  date: number
  accent: string
  glyph: string
  d: number
  current?: boolean
}

interface CardDef {
  tx: number
  rot: number
  d: number
  palette: { bg: string; primary: string; secondary: string }
  style: 'stripes' | 'rings' | 'halftone'
  band: string
  meta: string
  main?: boolean
}

interface ShareCardProps {
  palette: { bg: string; primary: string; secondary: string }
  main?: boolean
  style: 'stripes' | 'rings' | 'halftone'
  band: string
  meta: string
}

interface ShareArtProps {
  palette: { bg: string; primary: string; secondary: string }
}

interface PriceTagDef {
  sx: number
  sy: number
  val: string
  src: string
  accent: string
  d: number
  dur: number
}

interface BarDef {
  min: number
  max: number
  dur: number
  offset: number
}

interface ArtistTagDef {
  name: string
  accent: string
  d: number
}

// ════════════════════════════════════════════════════════════════
// TIER MEDALLION (internal)
// ════════════════════════════════════════════════════════════════

function TierMedallion({ tier }: { tier: TierDef }): React.ReactElement {
  const isFounder = tier.key === 'founder'
  const discSize = isFounder ? 134 : 108
  const haloSize = discSize * 1.6

  return (
    <div style={{
      position: 'relative',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      width: 160,
    }}>
      {/* halo glow behind */}
      <div style={{
        position: 'absolute',
        left: '50%', top: discSize / 2,
        width: haloSize, height: haloSize,
        marginLeft: -haloSize / 2, marginTop: -haloSize / 2,
        borderRadius: '50%',
        background: isFounder
          ? `radial-gradient(circle, ${tier.accent2 ?? tier.accent}55 0%, ${tier.accent}33 32%, transparent 65%)`
          : `radial-gradient(circle, ${tier.accent}33 0%, transparent 65%)`,
        opacity: isFounder ? 0.85 : 0.55,
        pointerEvents: 'none',
      }}/>

      {/* disc */}
      <div style={{
        position: 'relative',
        width: discSize, height: discSize,
        zIndex: 2,
      }}>
        <svg width={discSize} height={discSize} viewBox="0 0 120 120"
          style={{ position: 'absolute', inset: 0 }}>
          {isFounder && (
            <defs>
              <linearGradient id={`founder-ring-${tier.key}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={tier.accent}/>
                <stop offset="100%" stopColor={tier.accent2 ?? tier.accent}/>
              </linearGradient>
            </defs>
          )}
          {/* outer ring */}
          <circle cx="60" cy="60" r="57"
            fill="rgba(255,255,255,0.04)"
            stroke={isFounder ? `url(#founder-ring-${tier.key})` : tier.accent}
            strokeWidth="2.5"/>
          {/* inner subtle ring */}
          <circle cx="60" cy="60" r="48"
            fill="none"
            stroke={tier.accent}
            strokeWidth="0.6"
            opacity="0.45"/>
          {/* cardinal ticks */}
          {[0, 90, 180, 270].map(angle => (
            <line key={angle}
              x1="60" y1="3" x2="60" y2="8"
              stroke={tier.accent}
              strokeWidth="1.4"
              opacity="0.7"
              transform={`rotate(${angle} 60 60)`}/>
          ))}
        </svg>
        {/* HTML overlay glyph — perfectly centered */}
        <div style={{
          position: 'absolute',
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <TierGlyph
            tier={tier.key}
            size={discSize * 0.46}
            color={tier.accent}
            stroke={isFounder ? (tier.accent2 ?? null) : null}/>
        </div>
      </div>

      {/* label */}
      <div style={{
        textAlign: 'center',
        zIndex: 2,
        position: 'relative',
      }}>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: isFounder ? 16 : 14, fontWeight: 900,
          color: 'rgba(255,255,255,0.95)',
          letterSpacing: '-0.02em',
          marginBottom: 3,
          textShadow: '0 1px 8px rgba(0,0,0,0.8)',
        }}>{tier.name.toUpperCase()}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: tier.accent,
          letterSpacing: '1.5px',
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
        }}>{tier.priceText}</div>
        {isFounder && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 8, fontWeight: 800,
            color: tier.accent2 ?? tier.accent,
            letterSpacing: '1.8px',
            marginTop: 3,
            opacity: 0.92,
            textShadow: '0 1px 6px rgba(0,0,0,0.8)',
          }}>FIRST 100 ONLY</div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// HISTORY STUB (internal)
// ════════════════════════════════════════════════════════════════

function HistoryStub({ s }: HistoryStubProps): React.ReactElement {
  return (
    <div style={{ position: 'relative', width: 220, height: 130 }}>
      <svg width="220" height="130" viewBox="0 0 220 130">
        {/* body */}
        <path d="M0 12 Q0 0 12 0 L162 0 L162 130 L12 130 Q0 130 0 118 Z"
          fill={s.current ? '#0C0A14' : '#1A1626'}
          stroke={s.current ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
          strokeWidth="1"/>
        <path d="M170 0 L208 0 Q220 0 220 12 L220 118 Q220 130 208 130 L170 130 Z"
          fill={s.current ? '#0C0A14' : '#1A1626'}
          stroke={s.current ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
          strokeWidth="1"/>

        {/* ring (glyph rendered as HTML overlay below) */}
        <circle cx="40" cy="65" r="30" fill="none"
          stroke={s.accent} strokeWidth="2"
          opacity={s.current ? 0.95 : 0.6}/>

        {/* right column */}
        <text x="88" y={s.current ? 32 : 30}
          fontFamily="Inter, sans-serif"
          fontSize={s.current ? 17 : 14} fontWeight="900"
          fill={s.current ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)'}
          letterSpacing="-0.04em">{s.current ? 'TONIGHT' : 'ATTENDED'}</text>
        <text x="88" y="46"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="8" fontWeight="800" letterSpacing="1.5"
          fill={s.accent}
          opacity={s.current ? 0.85 : 0.65}>ADMIT ONE</text>
        <line x1="88" y1="54" x2="156" y2="54"
          stroke={s.accent} strokeWidth="1" opacity="0.5"/>
        {s.current ? (
          <>
            <text x="88" y="74"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="8" fontWeight="700" letterSpacing="1.4"
              fill="rgba(255,255,255,0.6)">DOORS · 8 PM</text>
            <text x="88" y="88"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="8" fontWeight="700" letterSpacing="1.4"
              fill="rgba(255,255,255,0.45)">GA · 21+</text>
            <text x="88" y="116"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="11" fontWeight="900" letterSpacing="2"
              fill={s.accent}>№ 034</text>
          </>
        ) : (
          <text x="88" y="74"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="7" fontWeight="700" letterSpacing="1.4"
            fill="rgba(255,255,255,0.4)">{s.year} · KEPT</text>
        )}

        {/* perforation */}
        <line x1="166" y1="6" x2="166" y2="124"
          stroke={s.accent} strokeWidth="1" strokeDasharray="3 4"
          opacity={s.current ? 0.55 : 0.4}/>
        {[14, 38, 62, 86, 110].map((yVal, idx) => (
          <circle key={idx} cx="166" cy={yVal + 6} r="1.5"
            fill={s.current ? '#0C0A14' : '#1A1626'}
            stroke={s.accent} strokeWidth="0.5"
            opacity={s.current ? 0.6 : 0.45}/>
        ))}

        {/* vertical tear-off */}
        <text x="195" y="12"
          fontFamily="'JetBrains Mono', monospace"
          fontSize="8" fontWeight="800"
          fill={s.accent}
          opacity={s.current ? 0.7 : 0.45}
          letterSpacing="2"
          transform="rotate(90 195 12)">{s.current ? 'NO RE-ENTRY' : 'STUB'}</text>
      </svg>

      {/* SVG overlay glyph — centroid-centered polygon, pixel-perfect */}
      <div style={{
        position: 'absolute',
        left: `${(40 / 220) * 100}%`,
        top: `${(65 / 130) * 100}%`,
        transform: 'translate(-50%, -50%)',
        opacity: s.current ? 1 : 0.75,
        pointerEvents: 'none',
      }}>
        <StubGlyph kind={s.glyph} size={s.current ? 40 : 32} color={s.accent}/>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SHARE CARD IDENTITY-ART COMPONENTS (internal)
// ════════════════════════════════════════════════════════════════

function ShareArtStripes({ palette }: ShareArtProps): React.ReactElement {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
      {Array.from({ length: 5 }).map((_, idx) => {
        const isPrimary = idx % 2 === 0
        return (
          <div key={idx} style={{
            flex: 1,
            background: isPrimary ? palette.primary : palette.secondary,
            opacity: 0.88,
            marginRight: idx < 4 ? 1 : 0,
            transform: isPrimary ? 'translateY(-3px)' : 'translateY(3px)',
            mixBlendMode: 'screen',
          }}/>
        )
      })}
    </div>
  )
}

function ShareArtRings({ palette }: ShareArtProps): React.ReactElement {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {/* mis-registered secondary rings */}
      <g transform="translate(3 3)" style={{ mixBlendMode: 'screen' } as React.CSSProperties}>
        {[44, 34, 24, 14].map((radius, idx) => (
          <circle key={`s-${idx}`} cx="62" cy="42" r={radius}
            fill="none" stroke={palette.secondary}
            strokeWidth="3" opacity="0.7"/>
        ))}
      </g>
      {/* primary rings */}
      <g style={{ mixBlendMode: 'screen' } as React.CSSProperties}>
        {[44, 34, 24, 14].map((radius, idx) => (
          <circle key={`p-${idx}`} cx="62" cy="42" r={radius}
            fill="none" stroke={palette.primary}
            strokeWidth="3" opacity="0.85"/>
        ))}
      </g>
    </svg>
  )
}

function ShareArtHalftone({ palette }: ShareArtProps): React.ReactElement {
  return (
    <>
      {/* mass anchored bottom-left */}
      <div style={{
        position: 'absolute',
        left: '-30%', bottom: '-25%',
        width: '115%', height: '115%',
        borderRadius: '50%',
        background: palette.primary,
        mixBlendMode: 'screen',
        opacity: 0.78,
      }}/>
      {/* halftone dot field from opposite corner */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen' } as React.CSSProperties}>
        {Array.from({ length: 30 }).map((_, idx) => {
          const col = idx % 6
          const row = Math.floor(idx / 6)
          const xPos = col * 16 + 10
          const yPos = row * 16 + 8
          const dist = Math.sqrt((5 - col) * (5 - col) + row * row)
          const radius = Math.max(0.8, 4 - dist * 0.55)
          return <circle key={idx} cx={xPos} cy={yPos} r={radius} fill={palette.secondary} opacity="0.9"/>
        })}
      </svg>
    </>
  )
}

function ShareCard({ palette, main, style, band, meta }: ShareCardProps): React.ReactElement {
  return (
    <div style={{
      position: 'relative',
      width: 140, height: 200,
      borderRadius: 8,
      background: palette.bg,
      border: main ? '1.5px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* identity-art region */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: palette.bg,
        overflow: 'hidden',
      }}>
        {style === 'stripes'  && <ShareArtStripes  palette={palette}/>}
        {style === 'rings'    && <ShareArtRings    palette={palette}/>}
        {style === 'halftone' && <ShareArtHalftone palette={palette}/>}

        {/* shine — only main card */}
        {main && (
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0, width: '55%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.32), transparent)',
            transform: 'translateX(-150%) skewX(-22deg)',
            animation: 'pcShineSweep 1.4s 1.3s ease-out forwards',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            zIndex: 5,
          }}/>
        )}
      </div>

      {/* paper scrim + title */}
      <div style={{
        background: palette.bg,
        padding: '9px 11px 11px',
        borderTop: `1px solid ${palette.primary}`,
      }}>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: main ? 13 : 11, fontWeight: 900,
          color: 'rgba(255,255,255,0.95)',
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          marginBottom: 3,
        }}>{band}</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 7, fontWeight: 800,
          color: palette.primary,
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
        }}>{meta}</div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TIER BADGES · Showtime  (#2)
// ════════════════════════════════════════════════════════════════
export function TierShowtime(): React.ReactElement {
  const tiers: TierDef[] = [
    {
      key: 'supporter', name: 'Supporter',
      priceText: '$2 / MONTH',
      accent: '#FF7BD4',
      pos: { tx: -180, rot: -3 },
      from: { sx: -260, sy: -100, srot: -20 },
      d: 0.10,
    },
    {
      key: 'founder', name: 'Founder',
      priceText: '$3 / MO · FOR LIFE',
      accent: '#7AE6FF',
      accent2: '#FF7BD4',
      pos: { tx: 0, rot: -1 },
      from: { sx: 0, sy: -240, srot: -8 },
      d: 0.45, founder: true,
    },
    {
      key: 'premium', name: 'Premium',
      priceText: '$5 / MONTH',
      accent: '#7AE6FF',
      pos: { tx: 180, rot: 3 },
      from: { sx: 260, sy: -100, srot: 20 },
      d: 0.25,
    },
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
      fontFamily: 'Inter, system-ui',
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      {/* Founder central two-tone spotlight */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        width: 300, height: 300,
        marginLeft: -150, marginTop: -190,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(122,230,255,0.18) 0%, rgba(255,123,212,0.12) 35%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      {tiers.map((tier) => (
        <div key={tier.key} style={{
          position: 'absolute',
          left: '50%', top: '50%',
          marginTop: -100,
          marginLeft: -80,
          ['--pc-sx' as string]: `${tier.from.sx}px`,
          ['--pc-sy' as string]: `${tier.from.sy}px`,
          ['--pc-srot' as string]: `${tier.from.srot}deg`,
          ['--pc-tx' as string]: `${tier.pos.tx}px`,
          ['--pc-rot' as string]: `${tier.pos.rot}deg`,
          transform: `translate(${tier.pos.tx}px, 0) rotate(${tier.pos.rot}deg)`,
          transformOrigin: 'center center',
          animation: `pc2StubDealVaried 800ms ${tier.d}s cubic-bezier(.2,.85,.2,1) both${tier.founder ? ', pc2StubBreathe 4.5s 1.7s ease-in-out infinite' : ''}`,
          zIndex: tier.founder ? 10 : 5,
          filter: tier.founder
            ? `drop-shadow(0 18px 28px rgba(0,0,0,0.55)) drop-shadow(0 0 26px ${tier.accent}66)`
            : `drop-shadow(0 8px 14px rgba(0,0,0,0.45)) drop-shadow(0 0 16px ${tier.accent}33)`,
        } as React.CSSProperties}>
          <TierMedallion tier={tier}/>
        </div>
      ))}

      <ShowtimeEyebrow dotHue="#7AE6FF">Pick your seat</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// CONCERT HISTORY · Showtime  (#3)
// ════════════════════════════════════════════════════════════════
export function HistoryShowtime(): React.ReactElement {
  const stubs: StubDef[] = [
    { x: 70,  rot: -4,  sx: -120, sy: -160, srot: -22, d: 0.10,
      accent: '#FFB838', glyph: '△', year: "'22" },
    { x: 130, rot:  2,  sx: -80,  sy:  80,  srot:  14, d: 0.20,
      accent: '#5DD4D6', glyph: '○', year: "'23" },
    { x: 195, rot: -3,  sx: -40,  sy: -120, srot: -10, d: 0.30,
      accent: '#FF7BD4', glyph: '⬡', year: "'23" },
    { x: 260, rot:  1,  sx:   0,  sy:  100, srot:   8, d: 0.40,
      accent: '#A075FF', glyph: '◆', year: "'24" },
    { x: 325, rot: -2,  sx:  40,  sy: -120, srot: -14, d: 0.50,
      accent: '#C9F26E', glyph: '+', year: "'24" },
    { x: 390, rot:  3,  sx:  80,  sy:   80, srot:  18, d: 0.60,
      accent: '#FFE36B', glyph: '✦', year: "'25" },
    { x: 470, rot: -1.5, sx: 220, sy: -200, srot:  -8, d: 0.85,
      accent: '#7AE6FF', glyph: '★', year: "'26", current: true },
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
      fontFamily: 'Inter, system-ui',
    }}>
      <ShowtimeBackdrop/>

      {/* year axis */}
      <div style={{
        position: 'absolute',
        left: 24, right: 200, top: 88,
        height: 1,
        background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.18), rgba(255,255,255,0.18), transparent)',
      }}/>

      {stubs.map((stub, idx) => (
        <div key={`yr-${idx}`} style={{
          position: 'absolute',
          left: (stub as StubDef & { x: number }).x, top: 96,
          transform: 'translateX(-50%)',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: stub.current ? stub.accent : 'rgba(255,255,255,0.55)',
          letterSpacing: '1.5px',
          opacity: 0,
          animation: `pc2EyebrowEnter 600ms ${stub.d + 0.2}s ease-out both`,
        }}>
          <span style={{
            display: 'block',
            width: 1, height: 6,
            background: stub.current ? stub.accent : 'rgba(255,255,255,0.35)',
            margin: '0 auto 4px',
          }}/>
          {stub.year}
        </div>
      ))}

      {/* big counter, top-right */}
      <div style={{
        position: 'absolute',
        right: 24, top: 14,
        textAlign: 'right',
        zIndex: 5,
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: 'rgba(255,255,255,0.65)',
          letterSpacing: '1.8px', textTransform: 'uppercase',
          opacity: 0,
          animation: 'pc2EyebrowEnter 800ms 1s ease-out both',
        }}>Nights kept</div>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 56, fontWeight: 900,
          color: '#FFFFFF',
          letterSpacing: '-0.05em',
          lineHeight: 0.9,
          marginTop: 2,
          textShadow: '0 0 24px rgba(122,230,255,0.35)',
          opacity: 0,
          animation: 'pc2EyebrowEnter 1s 1.1s ease-out both',
        }}>34</div>
      </div>

      {/* stubs cascade */}
      {stubs.map((stub, idx) => {
        const stubWithX = stub as StubDef & { x: number }
        const scale = stub.current ? 0.88 : 0.66
        return (
          <div key={idx} style={{
            position: 'absolute',
            left: stubWithX.x, top: 190,
            width: 220, height: 130,
            marginLeft: -110, marginTop: -65,
            ['--pc-sx' as string]: `${stub.sx}px`,
            ['--pc-sy' as string]: `${stub.sy}px`,
            ['--pc-srot' as string]: `${stub.srot}deg`,
            ['--pc-tx' as string]: '0px',
            ['--pc-rot' as string]: `${stub.rot}deg`,
            transform: `rotate(${stub.rot}deg) scale(${scale})`,
            transformOrigin: 'center center',
            animation: `pc2StubDealVaried 800ms ${stub.d}s cubic-bezier(.2,.85,.2,1) both${stub.current ? ', pc2StubBreathe 4.5s 2s ease-in-out infinite' : ''}`,
            zIndex: stub.current ? 20 : (10 - idx),
            filter: stub.current
              ? `drop-shadow(0 16px 26px rgba(0,0,0,0.55)) drop-shadow(0 0 18px ${stub.accent}55)`
              : 'drop-shadow(0 5px 10px rgba(0,0,0,0.5))',
            opacity: stub.current ? 1 : 0.85,
          } as React.CSSProperties}>
            <HistoryStub s={stub}/>
          </div>
        )
      })}

      <ShowtimeEyebrow dotHue="#7AE6FF">Every night, every year</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SUBMIT A PRICE · Showtime  (#1)
// ════════════════════════════════════════════════════════════════
export function PricesShowtime(): React.ReactElement {
  const tags: PriceTagDef[] = [
    { sx: -210, sy: -70,  val: '$45', src: 'CRAWLER',  accent: '#FFB838', d: 0.0,  dur: 3.4 },
    { sx:  225, sy: -50,  val: '$52', src: 'RESALE',   accent: '#A075FF', d: 0.55, dur: 3.6 },
    { sx: -240, sy:  60,  val: '$50', src: 'OFFICIAL', accent: '#5DD4D6', d: 1.10, dur: 3.2 },
    { sx:  230, sy:  90,  val: '$47', src: 'CRAWLER',  accent: '#FF7BD4', d: 1.65, dur: 3.5 },
    { sx: -180, sy: -130, val: '$48', src: 'CRAWLER',  accent: '#C9F26E', d: 2.20, dur: 3.3 },
    { sx:  200, sy: -130, val: '$49', src: 'CRAWLER',  accent: '#FFE36B', d: 2.75, dur: 3.4 },
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
      fontFamily: 'Inter, system-ui',
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      {/* central halo */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        width: 240, height: 240,
        marginLeft: -120, marginTop: -120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(122,230,255,0.28) 0%, transparent 65%)',
        pointerEvents: 'none',
      }}/>

      {/* central verified consensus */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5,
      }}>
        <div style={{
          textAlign: 'center',
          opacity: 0,
          animation: 'pc2EyebrowEnter 800ms 0.4s ease-out both',
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '2px',
            marginBottom: 4,
            textTransform: 'uppercase',
          }}>Face value · Ogden Theatre</div>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 76, fontWeight: 900,
            color: '#FFFFFF',
            letterSpacing: '-0.05em',
            lineHeight: 0.9,
            textShadow: '0 0 30px rgba(122,230,255,0.55), 0 0 60px rgba(122,230,255,0.25)',
            animation: 'pcCenterPulse 3s 1s ease-in-out infinite',
          }}>$48</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 10,
            padding: '3px 11px',
            border: '1.5px solid #7AE6FF',
            borderRadius: 999,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: '#7AE6FF',
            letterSpacing: '1.8px',
            textTransform: 'uppercase',
          }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 6 L5 9 L10 3"
                stroke="#7AE6FF" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Verified
          </div>
        </div>
      </div>

      {/* floating submitted-price tags drifting inward */}
      {tags.map((tag, idx) => (
        <div key={idx} style={{
          position: 'absolute',
          left: '50%', top: '50%',
          marginLeft: tag.sx, marginTop: tag.sy,
          ['--pc-dx' as string]: `${-tag.sx}px`,
          ['--pc-dy' as string]: `${-tag.sy}px`,
          opacity: 0,
          animation: `pcPriceTagDrift ${tag.dur}s ${tag.d}s ease-in-out infinite`,
          padding: '4px 9px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${tag.accent}55`,
          borderRadius: 3,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: tag.accent,
          letterSpacing: '1.4px',
          display: 'inline-flex', alignItems: 'center', gap: 7,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          boxShadow: `0 0 8px ${tag.accent}33`,
        } as React.CSSProperties}>
          <span style={{ color: '#FFFFFF', fontWeight: 900, fontSize: 11 }}>{tag.val}</span>
          <span style={{ opacity: 0.75 }}>{tag.src}</span>
        </div>
      ))}

      {/* report count below */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: 18,
        transform: 'translateX(-50%)',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '1.8px', textTransform: 'uppercase',
          opacity: 0,
          animation: 'pc2EyebrowEnter 800ms 1.4s ease-out both',
        }}>6 reports · last 7 days</div>
      </div>

      <ShowtimeEyebrow dotHue="#7AE6FF">Crowd-sourced · verified</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// CALENDAR EXPORT · Showtime  (#4)
// ════════════════════════════════════════════════════════════════
export function CalendarShowtime(): React.ReactElement {
  const showDates: ShowDateDef[] = [
    { date: 8,  accent: '#FF7BD4', glyph: '△', d: 0.55 },
    { date: 14, accent: '#A075FF', glyph: '○', d: 0.75 },
    { date: 22, accent: '#FFE36B', glyph: '⬡', d: 0.95 },
    { date: 27, accent: '#7AE6FF', glyph: '★', d: 1.20, current: true },
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
      fontFamily: 'Inter, system-ui',
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      <div style={{
        position: 'absolute',
        left: '50%', top: 38,
        transform: 'translateX(-50%)',
      }}>
        <div style={{
          textAlign: 'center',
          opacity: 0,
          animation: 'pc2EyebrowEnter 600ms 0.15s ease-out both',
        }}>
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 22, fontWeight: 900,
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>JUN 2026</div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        left: '50%', top: 78,
        transform: 'translateX(-50%)',
      }}>
        <div style={{
          opacity: 0,
          animation: 'pc2EyebrowEnter 700ms 0.3s ease-out both',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 32px)',
            gap: 4,
            marginBottom: 4,
          }}>
            {['M','T','W','T','F','S','S'].map((dayLabel, idx) => (
              <div key={idx} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9, fontWeight: 800,
                color: 'rgba(255,255,255,0.42)',
                letterSpacing: '1.5px',
                textAlign: 'center',
              }}>{dayLabel}</div>
            ))}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 32px)',
            gridTemplateRows: 'repeat(4, 32px)',
            gap: 4,
          }}>
            {Array.from({ length: 28 }).map((_, idx) => {
              const date = idx + 1
              const stamp = showDates.find(sd => sd.date === date)
              return (
                <div key={idx} style={{
                  position: 'relative',
                  width: 32, height: 32,
                  borderRadius: 3,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: stamp ? 'rgba(255,255,255,0.03)' : 'transparent',
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 2, left: 4,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 8, fontWeight: 700,
                    color: stamp ? stamp.accent : 'rgba(255,255,255,0.35)',
                    letterSpacing: '0.3px',
                  }}>{date}</span>

                  {stamp && (
                    <div style={{
                      position: 'absolute',
                      left: '50%', top: '56%',
                      width: stamp.current ? 22 : 16,
                      height: stamp.current ? 22 : 16,
                      borderRadius: '50%',
                      border: `1.5px solid ${stamp.accent}`,
                      background: 'rgba(0,0,0,0.4)',
                      opacity: 0,
                      transform: 'translate(-50%, -50%) scale(0)',
                      animation: `pcCalStamp 460ms ${stamp.d}s cubic-bezier(.2,.85,.2,1) both${stamp.current ? ', pcCalPulse 3s 1.8s ease-in-out infinite' : ''}`,
                      boxShadow: stamp.current
                        ? `0 0 14px ${stamp.accent}, 0 0 28px ${stamp.accent}55`
                        : `0 0 6px ${stamp.accent}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <StubGlyph kind={stamp.glyph}
                        size={stamp.current ? 14 : 11}
                        color={stamp.accent}/>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        left: '50%', bottom: 22,
        transform: 'translateX(-50%)',
      }}>
        <div style={{
          display: 'flex', gap: 18,
          opacity: 0,
          animation: 'pc2EyebrowEnter 700ms 1.7s ease-out both',
        }}>
          {['↓ APPLE', '↓ GOOGLE', '↓ .ICS'].map((label, idx) => (
            <span key={idx} style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, fontWeight: 800,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
            }}>{label}</span>
          ))}
        </div>
      </div>

      {/* destinations strip with RED ROCKS */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: 8,
        transform: 'translateX(-50%)',
        opacity: 0,
        animation: 'pc2EyebrowEnter 600ms 2.0s ease-out both',
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 8, fontWeight: 800,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '1.4px',
          textTransform: 'uppercase',
        }}>RED ROCKS · JUN 2026</span>
      </div>

      <ShowtimeEyebrow dotHue="#7AE6FF">Sync your shows</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SHAREABLE SHOW CARDS · Showtime  (#5)
// ════════════════════════════════════════════════════════════════
export function ShareableShowtime(): React.ReactElement {
  const cards: CardDef[] = [
    {
      tx: -120, rot: -10, d: 0.30,
      palette: { bg: '#1A2A30', primary: '#5DD4D6', secondary: '#FFB838' },
      style: 'stripes',
      band: 'tame impala',
      meta: 'RED ROCKS · JUN 2026',
    },
    {
      tx: 120, rot: 10, d: 0.45,
      palette: { bg: '#2A1A2A', primary: '#FF7BD4', secondary: '#A075FF' },
      style: 'rings',
      band: 'japanese breakfast',
      meta: 'OGDEN',
    },
    {
      tx: 0, rot: -2, d: 0.65,
      palette: { bg: '#0C0A14', primary: '#7AE6FF', secondary: '#FF7BD4' },
      style: 'halftone',
      band: 'fleet foxes',
      meta: 'MISSION BALLROOM · JUN 14',
      main: true,
    },
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
      fontFamily: 'Inter, system-ui',
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        width: 280, height: 280,
        marginLeft: -140, marginTop: -140,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(122,230,255,0.20) 0%, rgba(255,123,212,0.12) 35%, transparent 70%)',
        opacity: 0,
        animation: 'pc2EyebrowEnter 1.2s 0.6s ease-out both',
        pointerEvents: 'none',
      }}/>

      {cards.map((card, idx) => (
        <div key={idx} style={{
          position: 'absolute',
          left: '50%', top: '50%',
          marginLeft: -70, marginTop: -100,
          ['--pc-tx' as string]: `${card.tx}px`,
          ['--pc-rot' as string]: `${card.rot}deg`,
          transform: `translate(${card.tx}px, 0) rotate(${card.rot}deg)`,
          animation: `pcShareCardIn 720ms ${card.d}s cubic-bezier(.2,.85,.2,1) both`,
          zIndex: card.main ? 10 : 5,
          filter: card.main
            ? 'drop-shadow(0 18px 28px rgba(0,0,0,0.55)) drop-shadow(0 0 24px rgba(122,230,255,0.4))'
            : 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
        } as React.CSSProperties}>
          <ShareCard {...card}/>
        </div>
      ))}

      {/* share-arrow indicator on main card's upper-right */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        marginLeft: 50, marginTop: -110,
        width: 30, height: 30,
        borderRadius: '50%',
        background: 'rgba(122,230,255,0.18)',
        border: '1.5px solid #7AE6FF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 14,
        opacity: 0,
        animation: 'pcShareArrow 3.6s 1.6s ease-out infinite',
        boxShadow: '0 0 14px rgba(122,230,255,0.55)',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 8.5 L8.5 3 M5 3 L8.5 3 L8.5 6.5"
            stroke="#7AE6FF" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <ShowtimeEyebrow dotHue="#FF7BD4">Take it with you</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// WHO ELSE IS WATCHING · Showtime  (#6)
// ════════════════════════════════════════════════════════════════
export function WatchersShowtime(): React.ReactElement {
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
      fontFamily: 'Inter, system-ui',
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        width: 240, height: 240,
        marginLeft: -120, marginTop: -120,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(122,230,255,0.30) 0%, transparent 65%)',
        pointerEvents: 'none',
      }}/>

      {[0, 0.7, 1.4, 2.1].map((delay, idx) => (
        <div key={idx} style={{
          position: 'absolute',
          left: '50%', top: '50%',
          width: 360, height: 360,
          borderRadius: '50%',
          border: '2px solid #7AE6FF',
          opacity: 0,
          transform: 'translate(-50%, -50%) scale(0.18)',
          animation: `pcRingEmanate 2.8s ${delay}s ease-out infinite`,
          pointerEvents: 'none',
        }}/>
      ))}

      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        zIndex: 5,
        opacity: 0,
        animation: 'pc2EyebrowEnter 800ms 0.4s ease-out both',
      }}>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 82, fontWeight: 900,
          color: '#FFFFFF',
          letterSpacing: '-0.05em',
          lineHeight: 0.9,
          textShadow: '0 0 30px rgba(122,230,255,0.55), 0 0 60px rgba(122,230,255,0.3)',
          animation: 'pcCenterPulse 3s 0.8s ease-in-out infinite',
        }}>312</div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, fontWeight: 800,
          color: '#7AE6FF',
          letterSpacing: '2.2px',
          marginTop: 8,
          textTransform: 'uppercase',
        }}>watching now</div>
      </div>

      <ShowtimeEyebrow dotHue="#7AE6FF">Aggregate · no names</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SPOTIFY SYNC · Showtime  (#7)
// ════════════════════════════════════════════════════════════════
export function SpotifyShowtime(): React.ReactElement {
  const bars: BarDef[] = Array.from({ length: 14 }).map((_, idx) => {
    const minVal = 0.20 + Math.abs(Math.sin(idx * 0.8) * 0.18)
    const maxVal = 0.60 + Math.abs(Math.sin(idx * 0.6 + 1) * 0.40)
    const dur = 1.8 + Math.abs(Math.sin(idx * 0.42) * 1.4)
    return { min: minVal, max: maxVal, dur, offset: -idx * 0.18 }
  })

  const artists: ArtistTagDef[] = [
    { name: 'KHRUANGBIN',     accent: '#FF7BD4', d: 0.95 },
    { name: 'PHOEBE BRIDGERS', accent: '#7AE6FF', d: 1.10 },
    { name: 'ST. VINCENT',    accent: '#FFE36B', d: 1.25 },
  ]

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
      fontFamily: 'Inter, system-ui',
    }}>
      <ShowtimeBackdrop founderGlow={false}/>

      <div style={{
        position: 'absolute',
        right: 24, top: 14,
        textAlign: 'right',
        opacity: 0,
        animation: 'pc2EyebrowEnter 700ms 1.0s ease-out both',
      }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 800,
          color: 'rgba(255,255,255,0.65)',
          letterSpacing: '1.8px', textTransform: 'uppercase',
        }}>Artists imported</div>
        <div style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 56, fontWeight: 900,
          color: '#FFFFFF',
          letterSpacing: '-0.05em',
          lineHeight: 0.9,
          marginTop: 2,
          textShadow: '0 0 24px rgba(255,123,212,0.35)',
        }}>34</div>
      </div>

      <div style={{
        position: 'absolute',
        left: 36, right: 36, top: 96,
        height: 130,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        gap: 8,
        opacity: 0,
        animation: 'pc2EyebrowEnter 700ms 0.3s ease-out both',
      }}>
        {bars.map((bar, idx) => (
          <div key={idx} style={{
            flex: 1, maxWidth: 14,
            height: '100%',
            ['--eq-min' as string]: bar.min,
            ['--eq-max' as string]: bar.max,
            background: idx % 2 === 0 ? '#7AE6FF' : '#FF7BD4',
            borderRadius: '3px 3px 0 0',
            transformOrigin: 'bottom center',
            transform: `scaleY(${bar.min})`,
            animation: `pcEqWave ${bar.dur}s ${bar.offset}s ease-in-out infinite alternate`,
            boxShadow: idx % 2 === 0
              ? '0 0 8px rgba(122,230,255,0.5)'
              : '0 0 8px rgba(255,123,212,0.5)',
          } as React.CSSProperties}/>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        left: 36, right: 36, top: 226,
        height: 1,
        background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent)',
        opacity: 0,
        animation: 'pc2EyebrowEnter 600ms 0.5s ease-out both',
      }}/>

      <div style={{
        position: 'absolute',
        left: '50%', bottom: 18,
        transform: 'translateX(-50%)',
        display: 'flex', gap: 10,
      }}>
        {artists.map((artist, idx) => (
          <span key={idx} style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 800,
            color: artist.accent,
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            padding: '4px 9px',
            border: `1px solid ${artist.accent}66`,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.04)',
            opacity: 0,
            animation: `pcArtistTagIn 450ms ${artist.d}s cubic-bezier(.2,.85,.2,1) both`,
          }}>{artist.name}</span>
        ))}
      </div>

      <ShowtimeEyebrow dotHue="#FF7BD4">Library, on stage</ShowtimeEyebrow>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// CONCERT PASSPORT · Showtime  (#14)
// ════════════════════════════════════════════════════════════════
export function PassportShowtimeStubs(): React.ReactElement {
  const stubs = [
    { tx: -10, rot: -14, sx: -160, sy: -120, srot: -28, d: 0.10,
      body: '#1F1730', accent: '#FFB838', glyph: '△', subtitle: 'DOORS' },
    { tx: 10,  rot: 10,  sx: 180,  sy: -100, srot: 32,  d: 0.25,
      body: '#1A2A30', accent: '#5DD4D6', glyph: '○', subtitle: 'FRONT' },
    { tx: -12, rot: -6,  sx: -200, sy: 60,   srot: -20, d: 0.40,
      body: '#2A1A2A', accent: '#FF7BD4', glyph: '⬡', subtitle: 'PIT'   },
    { tx: 6,   rot: 4,   sx: 190,  sy: 40,   srot: 25,  d: 0.55,
      body: '#241F38', accent: '#A075FF', glyph: '◆', subtitle: 'GA'    },
    { tx: -5,  rot: -9,  sx: -180, sy: -140, srot: -15, d: 0.70,
      body: '#1A2820', accent: '#C9F26E', glyph: '+', subtitle: 'BALC'  },
    { tx: 4,   rot: 5,   sx: 200,  sy: -60,  srot: 18,  d: 0.85,
      body: '#2A1F1A', accent: '#FFE36B', glyph: '✦', subtitle: 'ENCORE'},
    // top — headline
    { tx: 0,   rot: -2,  sx: 0,    sy: -220, srot: -6,  d: 1.05,
      body: '#0C0A14', accent: '#7AE6FF', glyph: '★', subtitle: 'ADMIT ONE',
      top: true },
  ]

  const sparkles = Array.from({ length: 12 }).map((_, idx) => ({
    x: ((idx * 47) % 580),
    y: ((idx * 71) % 300),
    d: (idx * 0.23) % 3,
    hue: ['#7AE6FF', '#FFE36B', '#FF7BD4', '#FFFFFF'][idx % 4],
  }))

  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'radial-gradient(ellipse at 70% 30%, #1A1228 0%, #0A0613 80%)',
      fontFamily: 'Inter, system-ui',
    }}>
      {/* ONE warm wash + ONE cool wash — slow drift, screen blend */}
      <div style={{
        position: 'absolute',
        right: -60, top: -80,
        width: 360, height: 360,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,184,56,0.22) 0%, transparent 65%)',
        animation: 'pc2BgShift 12s ease-in-out infinite',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute',
        left: -80, bottom: -100,
        width: 320, height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(122,230,255,0.20) 0%, transparent 65%)',
        animation: 'pc2BgShift 14s 1s ease-in-out infinite',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
      }}/>

      {/* sparkles — 12 */}
      {sparkles.map((sp, idx) => (
        <span key={idx} style={{
          position: 'absolute',
          left: sp.x, top: sp.y,
          width: 3, height: 3,
          borderRadius: '50%',
          background: sp.hue,
          boxShadow: `0 0 6px ${sp.hue}`,
          animation: `pc2Sparkle 2.2s ${sp.d}s ease-in-out infinite`,
          pointerEvents: 'none',
        }}/>
      ))}

      {/* floor glow under stack */}
      <div style={{
        position: 'absolute',
        left: '50%', bottom: 30,
        width: 360, height: 60,
        transform: 'translateX(-50%)',
        background: 'radial-gradient(ellipse, rgba(122,230,255,0.20) 0%, transparent 60%)',
        filter: 'blur(4px)',
        pointerEvents: 'none',
      }}/>

      {/* stack */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        width: 220, height: 130,
      }}>
        {stubs.map((stub, idx) => (
          <div key={idx} style={{
            position: 'absolute',
            left: 0, top: 0,
            width: 220, height: 130,
            ['--pc-sx' as string]: `${stub.sx}px`,
            ['--pc-sy' as string]: `${stub.sy}px`,
            ['--pc-srot' as string]: `${stub.srot}deg`,
            ['--pc-tx' as string]: `${stub.tx}px`,
            ['--pc-rot' as string]: `${stub.rot}deg`,
            transform: `translate(${stub.tx}px, 0) rotate(${stub.rot}deg)`,
            transformOrigin: 'center center',
            animation: `pc2StubDealVaried 800ms ${stub.d}s cubic-bezier(.2,.85,.2,1) both${stub.top ? ', pc2StubBreathe 4.5s 2s ease-in-out infinite' : ''}`,
            zIndex: idx + 1,
            filter: stub.top
              ? 'drop-shadow(0 16px 26px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(122,230,255,0.28))'
              : 'drop-shadow(0 5px 10px rgba(0,0,0,0.45))',
          } as React.CSSProperties}>
            <ShowtimeStub stub={stub}/>
          </div>
        ))}
      </div>

      {/* eyebrow */}
      <div style={{
        position: 'absolute',
        left: 18, top: 16,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10, fontWeight: 800,
        color: 'rgba(255,255,255,0.92)',
        letterSpacing: '0.24em', textTransform: 'uppercase',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        textShadow: '0 1px 8px rgba(0,0,0,0.9)',
        animation: 'pc2EyebrowEnter 1.2s 0.2s ease-out both',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: 6,
          background: '#7AE6FF',
          boxShadow: '0 0 8px #7AE6FF',
          animation: 'pc2Pulse 1.6s ease-in-out infinite',
        }}/>
        Showtime · every night kept
      </div>
    </div>
  )
}
