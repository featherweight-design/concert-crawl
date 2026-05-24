'use client'

// showtime-base.tsx — shared Showtime stage primitives.
//
// Exports three components used by every Showtime hero:
//   ShowtimeBackdrop  — dark cinematic radial-gradient base + drifting
//                       warm/cool washes. Owns the full-bleed background.
//   ShowtimeEyebrow   — JetBrains Mono eyebrow at top-left with a pulsing
//                       accent dot. Standard across all heroes.
//   ShowtimeSparkles  — scattered particle field (only #14 Passport uses
//                       this at full count; others pass count=0 or omit).
//
// Also injects the base keyframe set (pc2-*) used by all Showtime heroes.
// Injection is idempotent — guarded by document.getElementById so mounting
// multiple heroes on one page never duplicates the <style> block.
//
// Stage contract (from SHOWTIME_HANDOFF.md §2):
//   - Render size: 580 × 300 px
//   - position: absolute; inset: 0 inside parent
//   - Background is theme-independent (always dark cinematic)
//   - Does NOT read CSS custom properties for colours
//
// Showtime palette:
//   Stage bg:    radial-gradient(ellipse at 70% 30%, #1A1228, #0A0613)
//   Warm wash:   rgba(255,184,56,0.22)
//   Cool wash:   rgba(122,230,255,0.20)
//   Accent set:  #7AE6FF · #FF7BD4 · #FFE36B · #A075FF · #C9F26E · #FFB838 · #5DD4D6

import { useEffect } from 'react'

// ── Keyframe injection ───────────────────────────────────────────────────────
// Matches the pc2-keyframes block from passport-concepts-v2.jsx exactly.
const SHOWTIME_BASE_KEYFRAMES = `
  @keyframes pc2StubDealVaried {
    0%   { transform: translate(var(--pc-sx, 0px), var(--pc-sy, -240px)) rotate(var(--pc-srot, 0deg)) scale(.6); opacity: 0; }
    60%  { transform: translate(var(--pc-tx, 0px), 8px) rotate(calc(var(--pc-rot, 0deg) + 3deg)) scale(1.03); opacity: 1; }
    100% { transform: translate(var(--pc-tx, 0px), 0)   rotate(var(--pc-rot, 0deg))             scale(1);    opacity: 1; }
  }
  @keyframes pc2StubBreathe {
    0%,100% { transform: translate(var(--pc-tx, 0px), 0)    rotate(var(--pc-rot, 0deg)); }
    50%     { transform: translate(var(--pc-tx, 0px), -4px) rotate(calc(var(--pc-rot, 0deg) - 0.6deg)); }
  }
  @keyframes pc2Confetti {
    0%   { transform: translate(0,0) rotate(0deg); opacity: 0; }
    15%  { opacity: 1; }
    100% { transform: translate(var(--pc-cx, 100px), var(--pc-cy, -200px)) rotate(var(--pc-cr, 540deg)); opacity: 0; }
  }
  @keyframes pc2BgShift {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(8px,-6px) scale(1.04); }
  }
  @keyframes pc2Aura {
    0%   { transform: translate(-50%,-50%) scale(.7);  opacity: .85; }
    100% { transform: translate(-50%,-50%) scale(1.85); opacity: 0; }
  }
  @keyframes pc2PhoneIn {
    0%   { transform: translateY(50px) rotate(-12deg) scale(.86); opacity: 0; }
    55%  { transform: translateY(-6px) rotate(-5deg)  scale(1.02); opacity: 1; }
    100% { transform: translateY(0)    rotate(-8deg)  scale(1);   opacity: 1; }
  }
  @keyframes pc2PhoneFloat {
    0%,100% { transform: translateY(0)    rotate(-8deg); }
    50%     { transform: translateY(-6px) rotate(-7deg); }
  }
  @keyframes pc2Shine {
    0%   { transform: translateX(-140%) skewX(-22deg); }
    100% { transform: translateX(240%)  skewX(-22deg); }
  }
  @keyframes pc2StampPop {
    0%   { transform: scale(0) rotate(calc(var(--pc-srot, 0deg) - 25deg)); opacity: 0; }
    55%  { transform: scale(1.18) rotate(calc(var(--pc-srot, 0deg) + 4deg)); opacity: 1; }
    100% { transform: scale(1) rotate(var(--pc-srot, 0deg)); opacity: 1; }
  }
  @keyframes pc2Sparkle {
    0%,100% { opacity: 0; transform: scale(.6); }
    50%     { opacity: 1; transform: scale(1.2); }
  }
  @keyframes pc2Pulse {
    0%,100% { opacity: 1; }
    50%     { opacity: .55; }
  }
  @keyframes pc2EyebrowEnter {
    0%   { opacity: 0; transform: translateY(-6px); letter-spacing: 0.5em; }
    100% { opacity: 1; transform: translateY(0);    letter-spacing: 0.24em; }
  }
`

const KEYFRAMES_ID = 'showtime-base-keyframes'

/** Injects all Showtime keyframe sets once into the document head. */
export function useShowtimeKeyframes() {
  useEffect(() => {
    if (!document.getElementById(KEYFRAMES_ID)) {
      const styleEl = document.createElement('style')
      styleEl.id = KEYFRAMES_ID
      styleEl.textContent = SHOWTIME_BASE_KEYFRAMES
      document.head.appendChild(styleEl)
    }
    injectHeroKeyframes()
  }, [])
}

// ── ShowtimeBackdrop ─────────────────────────────────────────────────────────

interface ShowtimeBackdropProps {
  /**
   * When true, renders a centred gold glow — used by the Founder medallion
   * in the Tier hero to call extra attention to the marquee badge.
   */
  founderGlow?: boolean
}

/**
 * Full-bleed dark cinematic stage background.
 *
 * Renders `position: absolute; inset: 0` and owns the radial-gradient base
 * plus two drifting colour washes (warm amber top-right, cool cyan
 * bottom-left). Parent must be `position: relative; overflow: hidden`.
 *
 * Theme-independent: always dark Showtime palette regardless of
 * electric / jade / light theme on the surrounding app chrome.
 */
export function ShowtimeBackdrop({ founderGlow = false }: ShowtimeBackdropProps) {
  useShowtimeKeyframes()

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 70% 30%, #1A1228, #0A0613)',
        overflow: 'hidden',
      }}
    >
      {/* warm amber wash — drifts top-right */}
      <div
        style={{
          position: 'absolute',
          right: -60,
          top: -80,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,184,56,0.22) 0%, transparent 65%)',
          animation: 'pc2BgShift 12s ease-in-out infinite',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />

      {/* cool cyan wash — drifts bottom-left */}
      <div
        style={{
          position: 'absolute',
          left: -80,
          bottom: -100,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(122,230,255,0.20) 0%, transparent 65%)',
          animation: 'pc2BgShift 14s 1s ease-in-out infinite',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />

      {/* optional centred gold glow for Founder marquee */}
      {founderGlow && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 280,
            height: 280,
            marginLeft: -140,
            marginTop: -140,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,227,107,0.18) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

// ── ShowtimeEyebrow ──────────────────────────────────────────────────────────

interface ShowtimeEyebrowProps {
  /** The label text rendered in JetBrains Mono uppercase. */
  children: React.ReactNode
  /** Colour of the pulsing dot. Defaults to Showtime cyan (#7AE6FF). */
  dotHue?: string
}

/**
 * Top-left mono eyebrow with a pulsing accent dot.
 *
 * Rendered at `position: absolute; left: 18; top: 16` so it sits on top of
 * any backdrop or hero content without requiring a z-index battle.
 * Animates in via `pc2EyebrowEnter` on mount.
 */
export function ShowtimeEyebrow({
  children,
  dotHue = '#7AE6FF',
}: ShowtimeEyebrowProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 18,
        top: 16,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 800,
        color: 'rgba(255,255,255,0.92)',
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        textShadow: '0 1px 8px rgba(0,0,0,0.9)',
        animation: 'pc2EyebrowEnter 1.2s 0.2s ease-out both',
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 6,
          background: dotHue,
          boxShadow: `0 0 8px ${dotHue}`,
          animation: 'pc2Pulse 1.6s ease-in-out infinite',
          flexShrink: 0,
        }}
      />
      {children}
    </div>
  )
}

// ── ShowtimeSparkles ─────────────────────────────────────────────────────────

interface ShowtimeSparklesProps {
  /** Stage width. Defaults to 580 (the full hero width). */
  width?: number
  /** Stage height. Defaults to 300 (the full hero height). */
  height?: number
  /**
   * Number of sparkle particles to render.
   * Per design restraint, only the Passport (#14) hero uses the full 12.
   * Pass 0 to suppress entirely (the default for most heroes).
   */
  count?: number
}

/** Scattered sparkle particle field. Reserved for heroes that opt in. */
export function ShowtimeSparkles({
  width = 580,
  height = 300,
  count = 0,
}: ShowtimeSparklesProps) {
  if (count === 0) return null

  const SPARKLE_HUES = ['#7AE6FF', '#FFE36B', '#FF7BD4', '#FFFFFF'] as const

  const sparkles = Array.from({ length: count }).map((_, idx) => ({
    x: (idx * 47) % width,
    y: (idx * 71) % height,
    delay: (idx * 0.23) % 3,
    hue: SPARKLE_HUES[idx % SPARKLE_HUES.length],
  }))

  return (
    <>
      {sparkles.map((sp, idx) => (
        <span
          key={idx}
          aria-hidden
          style={{
            position: 'absolute',
            left: sp.x,
            top: sp.y,
            width: 3,
            height: 3,
            borderRadius: '50%',
            background: sp.hue,
            boxShadow: `0 0 6px ${sp.hue}`,
            animation: `pc2Sparkle 2.2s ${sp.delay}s ease-in-out infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

// ── Palette export ───────────────────────────────────────────────────────────

/**
 * The 7-colour Showtime accent set.
 * Heroes rotate through these in order; use as `SHOWTIME_ACCENTS[idx % 7]`.
 */
export const SHOWTIME_ACCENTS = [
  '#7AE6FF', // cyan
  '#FF7BD4', // pink
  '#FFE36B', // gold
  '#A075FF', // violet
  '#C9F26E', // lime
  '#FFB838', // amber
  '#5DD4D6', // teal
] as const

export type ShowtimeAccent = (typeof SHOWTIME_ACCENTS)[number]

// ── Additional keyframes (p1 / p2 / compact heroes) ─────────────────────────
// Injected once alongside the pc2 base set. Separated by id so the base set
// can load without requiring hero files to be imported first.

const SHOWTIME_HERO_KEYFRAMES = `
  /* ── p1 ── */
  @keyframes pcCalStamp {
    0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    55%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }
  @keyframes pcCalPulse {
    0%,100% { transform: translate(-50%, -50%) scale(1); }
    50%     { transform: translate(-50%, -50%) scale(1.06); }
  }
  @keyframes pcShareCardIn {
    0%   { transform: translate(var(--pc-tx, 0px), 60px) rotate(var(--pc-rot, 0deg)) scale(.85); opacity: 0; }
    55%  { transform: translate(var(--pc-tx, 0px), -4px) rotate(var(--pc-rot, 0deg)) scale(1.02); opacity: 1; }
    100% { transform: translate(var(--pc-tx, 0px), 0)    rotate(var(--pc-rot, 0deg)) scale(1);    opacity: 1; }
  }
  @keyframes pcShineSweep {
    0%   { transform: translateX(-150%) skewX(-22deg); opacity: 0; }
    10%  { opacity: 1; }
    100% { transform: translateX(220%)  skewX(-22deg); opacity: 0; }
  }
  @keyframes pcShareArrow {
    0%,10% { opacity: 0; transform: translate(0, 0) scale(.85); }
    20%    { opacity: 1; transform: translate(0, 0) scale(1.1); }
    30%    { opacity: 1; transform: translate(2px, -2px) scale(1); }
    60%    { opacity: 1; transform: translate(2px, -2px) scale(1); }
    100%   { opacity: 0; transform: translate(8px, -8px) scale(.9); }
  }
  @keyframes pcRingEmanate {
    0%   { transform: translate(-50%, -50%) scale(0.18); opacity: 0.85; }
    80%  { opacity: 0.15; }
    100% { transform: translate(-50%, -50%) scale(1.0);  opacity: 0; }
  }
  @keyframes pcCenterPulse {
    0%,100% { transform: scale(1); }
    50%     { transform: scale(1.04); }
  }
  @keyframes pcEqWave {
    0%,100% { transform: scaleY(var(--eq-min, 0.25)); }
    50%     { transform: scaleY(var(--eq-max, 1)); }
  }
  @keyframes pcArtistTagIn {
    0%   { opacity: 0; transform: translateY(14px) scale(.92); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes pcPriceTagDrift {
    0%   { opacity: 0; transform: translate(0, 0); }
    12%  { opacity: 1; }
    55%  { opacity: 0.85; transform: translate(calc(var(--pc-dx, 0px) * 0.6), calc(var(--pc-dy, 0px) * 0.6)); }
    100% { opacity: 0;    transform: translate(calc(var(--pc-dx, 0px) * 0.95), calc(var(--pc-dy, 0px) * 0.95)); }
  }

  /* ── p2 ── */
  @keyframes p2Ping {
    0%   { transform: translate(-50%, -50%) scale(0.55); opacity: 0.55; }
    80%  { opacity: 0.10; }
    100% { transform: translate(-50%, -50%) scale(1);    opacity: 0; }
  }
  @keyframes p2NotifIn {
    0%   { opacity: 0; transform: translateY(14px) scale(.96); }
    55%  { opacity: 1; transform: translateY(-2px) scale(1.01); }
    100% { opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes p2HeartBeat {
    0%,100% { transform: scale(1); }
    45%     { transform: scale(1.18); }
    55%     { transform: scale(0.96); }
  }
  @keyframes p2OldOut {
    0%,18%  { opacity: 0.85; transform: translateY(0)    scale(1); }
    40%     { opacity: 0;    transform: translateY(-22px) scale(.92); }
    100%    { opacity: 0;    transform: translateY(-22px) scale(.92); }
  }
  @keyframes p2NewIn {
    0%,30%  { opacity: 0; transform: translateY(22px) scale(.92); }
    55%     { opacity: 1; transform: translateY(0)    scale(1.05); }
    75%,100%{ opacity: 1; transform: translateY(0)    scale(1); }
  }
  @keyframes p2ArrowFall {
    0%   { transform: translateY(-26px); opacity: 0; }
    18%  { opacity: 1; }
    82%  { opacity: 1; }
    100% { transform: translateY(28px);  opacity: 0; }
  }
  @keyframes p2SavedIn {
    0%   { opacity: 0; transform: translateX(-12px) scale(.9); }
    100% { opacity: 1; transform: translateX(0)     scale(1); }
  }
  @keyframes p2LineType {
    0%   { opacity: 0; clip-path: inset(0 100% 0 0); }
    8%   { opacity: 1; }
    100% { opacity: 1; clip-path: inset(0 0 0 0); }
  }
  @keyframes p2ChipDeal {
    0%   { opacity: 0; transform: translate(var(--p2-fx, 0), var(--p2-fy, 0)) scale(.85); }
    55%  { opacity: 1; transform: translate(0,0) scale(1.04); }
    100% { opacity: 1; transform: translate(0,0) scale(1); }
  }
  @keyframes p2PlateIn {
    0%   { opacity: 0; transform: translate(-50%, -50%) scale(.92); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes p2OpenerLift {
    0%,100% { transform: translate(0, 0)   rotate(var(--p2-rot, 0deg)); }
    50%     { transform: translate(0, -4px) rotate(calc(var(--p2-rot, 0deg) - 0.6deg)); }
  }
  @keyframes p2CardDeal {
    0%   { opacity: 0; transform: translate(var(--p2-tx, 0px), 22px) rotate(var(--p2-rot, 0deg)) scale(.94); }
    55%  { opacity: 1; transform: translate(var(--p2-tx, 0px), -3px) rotate(var(--p2-rot, 0deg)) scale(1.02); }
    100% { opacity: 1; transform: translate(var(--p2-tx, 0px), 0)    rotate(var(--p2-rot, 0deg)) scale(1); }
  }
  @keyframes p2PassportIn {
    0%   { opacity: 0; transform: translate(-50%, -50%) rotate(-2deg) scale(.9); }
    60%  { opacity: 1; transform: translate(-50%, -50%) rotate(-2deg) scale(1.02); }
    100% { opacity: 1; transform: translate(-50%, -50%) rotate(-2deg) scale(1); }
  }
  @keyframes p2MiniStampIn {
    0%   { opacity: 0; transform: scale(0) rotate(var(--p2-mrot, 0deg)); }
    60%  { opacity: 1; transform: scale(1.18) rotate(var(--p2-mrot, 0deg)); }
    100% { opacity: 1; transform: scale(1)    rotate(var(--p2-mrot, 0deg)); }
  }

  /* ── compact ── */
  @keyframes cmpBgShift {
    0%,100% { transform: translate(0,0) scale(1); }
    50%     { transform: translate(4px,-3px) scale(1.04); }
  }
  @keyframes cmpFadeIn {
    0%   { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes cmpScaleIn {
    0%   { opacity: 0; transform: var(--cmp-base, none) scale(.85); }
    60%  { opacity: 1; transform: var(--cmp-base, none) scale(1.05); }
    100% { opacity: 1; transform: var(--cmp-base, none) scale(1); }
  }
  @keyframes cmpPulse {
    0%,100% { opacity: 1; }
    50%     { opacity: .5; }
  }
  @keyframes cmpBreathe {
    0%,100% { transform: var(--cmp-base, none) translateY(0); }
    50%     { transform: var(--cmp-base, none) translateY(-2px); }
  }
  @keyframes cmpEqWave {
    0%,100% { transform: scaleY(var(--cmp-eq-min, 0.25)); }
    50%     { transform: scaleY(var(--cmp-eq-max, 1)); }
  }
  @keyframes cmpPing {
    0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0.7; }
    80%  { opacity: 0.10; }
    100% { transform: translate(-50%, -50%) scale(1.0); opacity: 0; }
  }
  @keyframes cmpStampIn {
    0%   { opacity: 0; transform: var(--cmp-base, none) scale(0); }
    60%  { opacity: 1; transform: var(--cmp-base, none) scale(1.18); }
    100% { opacity: 1; transform: var(--cmp-base, none) scale(1); }
  }
  @keyframes cmpRing {
    0%   { transform: translate(-50%, -50%) scale(0.18); opacity: 0.7; }
    80%  { opacity: 0.15; }
    100% { transform: translate(-50%, -50%) scale(1.0); opacity: 0; }
  }
  @keyframes cmpSparkle {
    0%,100% { opacity: 0; transform: scale(.6); }
    50%     { opacity: 1; transform: scale(1.2); }
  }
  @keyframes cmpStubDeal {
    0%   { transform: var(--cmp-base, none) translate(var(--cmp-sx, 0px), var(--cmp-sy, -60px)) rotate(var(--cmp-srot, 0deg)) scale(.7); opacity: 0; }
    100% { transform: var(--cmp-base, none) translate(0, 0) rotate(var(--cmp-rot, 0deg)) scale(1); opacity: 1; }
  }
  @keyframes cmpArrowFall {
    0%   { transform: translateY(-10px); opacity: 0; }
    30%  { opacity: 1; }
    80%  { opacity: 1; }
    100% { transform: translateY(14px); opacity: 0; }
  }
`

const HERO_KEYFRAMES_ID = 'showtime-hero-keyframes'

function injectHeroKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(HERO_KEYFRAMES_ID)) return
  const styleEl = document.createElement('style')
  styleEl.id = HERO_KEYFRAMES_ID
  styleEl.textContent = SHOWTIME_HERO_KEYFRAMES
  document.head.appendChild(styleEl)
}

// ── StubGlyph ────────────────────────────────────────────────────────────────
// SVG polygon whose centroid sits at the (12,12) centre of a 0–24 viewBox.
// Combined with translate(-50%, -50%) on the wrapper, the glyph is pixel-
// perfect centred. Used by Passport stubs, History stubs, and Calendar stamps.

export interface StubDef {
  tx: number
  rot: number
  sx: number
  sy: number
  srot: number
  body: string
  accent: string
  glyph: string
  subtitle: string
  top?: boolean
  d: number
}

interface StubGlyphProps {
  kind: string
  size?: number
  color: string
}

export function StubGlyph({ kind, size = 36, color }: StubGlyphProps): React.ReactElement | null {
  injectHeroKeyframes()
  const svgProps = { width: size, height: size, viewBox: '0 0 24 24', style: { display: 'block' as const } }
  switch (kind) {
    case '★':
      return (
        <svg {...svgProps}>
          <polygon points="12,2 14.35,8.76 21.51,8.91 15.8,13.24 17.88,20.09 12,16 6.12,20.09 8.2,13.24 2.49,8.91 9.65,8.76" fill={color} />
        </svg>
      )
    case '△':
      return (
        <svg {...svgProps}>
          <polygon points="12,2 20.66,17 3.34,17" fill={color} />
        </svg>
      )
    case '○':
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="2.8" />
        </svg>
      )
    case '⬡':
      return (
        <svg {...svgProps}>
          <polygon points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7" fill={color} />
        </svg>
      )
    case '◆':
      return (
        <svg {...svgProps}>
          <polygon points="12,2 22,12 12,22 2,12" fill={color} />
        </svg>
      )
    case '+':
      return (
        <svg {...svgProps}>
          <path d="M12 3 L12 21 M3 12 L21 12" stroke={color} strokeWidth="3.8" strokeLinecap="round" fill="none" />
        </svg>
      )
    case '✦':
      return (
        <svg {...svgProps}>
          <polygon points="12,1 15,9 23,12 15,15 12,23 9,15 1,12 9,9" fill={color} />
        </svg>
      )
    default:
      return null
  }
}

// ── ShowtimeStub ─────────────────────────────────────────────────────────────
// Renders a single concert ticket stub SVG with an HTML overlay glyph.
// Used by PassportShowtimeStubs and HistoryShowtime.

export function ShowtimeStub({ stub }: { stub: StubDef }): React.ReactElement {
  return (
    <div style={{ position: 'relative', width: 220, height: 130 }}>
      <svg width="220" height="130" viewBox="0 0 220 130">
        {/* body */}
        <path
          d="M0 12 Q0 0 12 0 L162 0 L162 130 L12 130 Q0 130 0 118 Z"
          fill={stub.body}
          stroke={stub.top ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}
          strokeWidth="1"
        />
        <path
          d="M170 0 L208 0 Q220 0 220 12 L220 118 Q220 130 208 130 L170 130 Z"
          fill={stub.body}
          stroke={stub.top ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'}
          strokeWidth="1"
        />
        {/* restrained mark — ring */}
        <circle cx="40" cy="65" r="30" fill="none" stroke={stub.accent} strokeWidth="2" opacity={stub.top ? 0.9 : 0.65} />
        {/* right column copy */}
        <text x="88" y={stub.top ? 32 : 30} fontFamily="Inter, sans-serif" fontSize={stub.top ? 17 : 14} fontWeight="900" fill="rgba(255,255,255,0.95)" letterSpacing="-0.04em">
          {stub.top ? 'TONIGHT' : stub.subtitle}
        </text>
        <text x="88" y="46" fontFamily="'JetBrains Mono', monospace" fontSize="8" fontWeight="800" letterSpacing="1.5" fill={stub.accent} opacity="0.85">ADMIT ONE</text>
        <line x1="88" y1="54" x2="156" y2="54" stroke={stub.accent} strokeWidth="1" opacity="0.5" />
        {stub.top ? (
          <>
            <text x="88" y="74" fontFamily="'JetBrains Mono', monospace" fontSize="8" fontWeight="700" letterSpacing="1.4" fill="rgba(255,255,255,0.6)">DOORS · 8 PM</text>
            <text x="88" y="88" fontFamily="'JetBrains Mono', monospace" fontSize="8" fontWeight="700" letterSpacing="1.4" fill="rgba(255,255,255,0.45)">GA · 21+</text>
            <text x="88" y="116" fontFamily="'JetBrains Mono', monospace" fontSize="11" fontWeight="900" letterSpacing="2" fill={stub.accent}>№ 034</text>
          </>
        ) : (
          <text x="88" y="74" fontFamily="'JetBrains Mono', monospace" fontSize="7" fontWeight="700" letterSpacing="1.4" fill="rgba(255,255,255,0.4)">DOORS · 8 PM</text>
        )}
        {/* perforation */}
        <line x1="166" y1="6" x2="166" y2="124" stroke={stub.accent} strokeWidth="1" strokeDasharray="3 4" opacity="0.5" />
        {[14, 38, 62, 86, 110].map((yVal, jdx) => (
          <circle key={jdx} cx="166" cy={yVal + 6} r="1.5" fill={stub.body} stroke={stub.accent} strokeWidth="0.5" opacity="0.55" />
        ))}
        {/* vertical tear-off text */}
        <text x="195" y="12" fontFamily="'JetBrains Mono', monospace" fontSize="8" fontWeight="800" fill={stub.accent} opacity={stub.top ? 0.7 : 0.5} letterSpacing="2" transform="rotate(90 195 12)">
          {stub.top ? 'NO RE-ENTRY' : 'STUB'}
        </text>
      </svg>
      {/* SVG overlay glyph — centroid-centred */}
      <div
        style={{
          position: 'absolute',
          left: `${(40 / 220) * 100}%`,
          top: `${(65 / 130) * 100}%`,
          transform: 'translate(-50%, -50%)',
          opacity: stub.top ? 1 : 0.8,
          pointerEvents: 'none',
        }}
      >
        <StubGlyph kind={stub.glyph} size={stub.top ? 40 : 32} color={stub.accent} />
      </div>
    </div>
  )
}

// ── TierGlyph ────────────────────────────────────────────────────────────────
// SVG glyph for the three Concert Crawl tier badges.
// supporter → + (plus), premium → ★ (star), founder → ♔ (crown)

interface TierGlyphProps {
  tier: 'supporter' | 'premium' | 'founder' | string
  size?: number
  color?: string
  stroke?: string
}

export function TierGlyph({ tier, size = 50, color = '#fff', stroke }: TierGlyphProps): React.ReactElement | null {
  if (tier === 'supporter') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
        <path d="M12 4.5 L12 19.5 M4.5 12 L19.5 12" stroke={color} strokeWidth="3.6" strokeLinecap="round" />
      </svg>
    )
  }
  if (tier === 'premium') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
        <polygon points="12,2.5 14.85,8.45 21.5,9.45 16.5,13.85 18.05,20.5 12,17.05 5.95,20.5 7.5,13.85 2.5,9.45 9.15,8.45" fill={color} />
      </svg>
    )
  }
  if (tier === 'founder') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
        <path d="M3 17 L3 7.5 L7.5 13 L12 4 L16.5 13 L21 7.5 L21 17 Z" fill={color} stroke={stroke ?? color} strokeWidth="0.6" strokeLinejoin="round" />
        <rect x="3" y="17.5" width="18" height="2.6" rx="0.5" fill={color} />
        <circle cx="7.5" cy="11.2" r="0.95" fill={stroke ?? color} />
        <circle cx="12" cy="6.5" r="0.95" fill={stroke ?? color} />
        <circle cx="16.5" cy="11.2" r="0.95" fill={stroke ?? color} />
      </svg>
    )
  }
  return null
}
