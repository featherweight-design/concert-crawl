import { IdentityArt, identityFor, ia_isDark } from '@/components/consumer/identity-art/IdentityArt'

export interface LandingShow {
  id: string
  artist: string
  venue: string
  city: string
  dateShort: string
  showTime: string
  opener: string | null
  state: 'tonight' | 'soldout' | null
}

const LP_STATE_PILLS = {
  tonight: { label: 'TONIGHT', tone: 'hot' as const },
  going: { label: 'GOING', tone: 'live' as const },
  soldout: { label: 'SOLD OUT', tone: 'warn' as const },
  drop: { label: 'PRICE DROP', tone: 'good' as const },
} as const

type PillState = keyof typeof LP_STATE_PILLS

function lpSmartBreak(name: string, maxLines = 3): string[] {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return []
  if (words.length === 1) return [words[0]!]
  const connectors = new Set(['THE', 'AND', 'OF', 'A', 'AN', '&', 'FT', 'FT.', 'FEAT', 'FEAT.'])
  if (words.length === 2) {
    const joined = words.join(' ')
    const longest = Math.max(words[0]!.length, words[1]!.length)
    if (joined.length <= 9 && longest <= 6) return [joined]
    return [words[0]!, words[1]!]
  }
  const groups: string[] = []
  let idx = 0
  while (idx < words.length) {
    const ww = words[idx]!.toUpperCase()
    if (connectors.has(ww) && idx < words.length - 1) {
      groups.push(`${words[idx]!} ${words[idx + 1]!}`)
      idx += 2
    } else {
      groups.push(words[idx]!)
      idx += 1
    }
  }
  if (groups.length <= maxLines) return groups
  while (groups.length > maxLines) {
    let bestI = 0
    let bestLen = Infinity
    for (let ii = 0; ii < groups.length - 1; ii++) {
      const len = groups[ii]!.length + groups[ii + 1]!.length + 1
      if (len < bestLen) {
        bestLen = len
        bestI = ii
      }
    }
    groups.splice(bestI, 2, `${groups[bestI]!} ${groups[bestI + 1]!}`)
  }
  return groups
}

function lpAutoFit(lines: string[], innerWidth: number, max: number, min: number): number {
  const longest = lines.reduce((mm, ll) => Math.max(mm, ll.length), 0)
  if (!longest) return min
  const fitted = (innerWidth * 0.96) / longest / 0.6
  return Math.max(min, Math.min(max, Math.floor(fitted)))
}

function lpPaperRgb(hex: string, alpha: number): string {
  const match = String(hex).match(/^#([0-9a-f]{6})$/i)
  if (!match) return `rgba(0,0,0,${alpha})`
  const num = parseInt(match[1]!, 16)
  return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`
}

interface StatePillProps {
  state: PillState | null | undefined
  ink: string
  paper: string
  ww: number
}

function LPStatePill({ state, ink, paper, ww }: StatePillProps) {
  if (!state || !(state in LP_STATE_PILLS)) return null
  const meta = LP_STATE_PILLS[state as PillState]
  const isHot = meta.tone === 'hot'
  const px = Math.round(ww * 0.035)
  const py = Math.round(ww * 0.018)
  const dotSize = Math.max(4, Math.round(ww * 0.018))
  const borderWidth = Math.max(1, Math.round(ww * 0.005))

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.round(ww * 0.018),
        padding: `${py}px ${px}px`,
        background: isHot ? ink : 'transparent',
        color: isHot ? paper : ink,
        border: isHot ? 'none' : `${borderWidth}px solid ${ink}`,
        borderRadius: 999,
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 800,
        fontSize: Math.max(8, Math.round(ww * 0.033)),
        letterSpacing: '0.14em',
        lineHeight: 1,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: 999,
          background: isHot ? paper : ink,
          animation: isHot ? 'lpPulse 1.4s ease-in-out infinite' : 'none',
          flexShrink: 0,
        }}
      />
      {meta.label}
    </span>
  )
}

interface LandingPosterProps {
  show: LandingShow
  width?: number
  height?: number
  grain?: number
}

export function LandingPoster({ show, width = 320, height, grain = 0.1 }: LandingPosterProps) {
  const ww = width
  const hh = height ?? Math.round(width * 1.38)

  const resolved = identityFor(show.artist, 'artist')
  const pal = resolved.palette
  const dark = ia_isDark(pal.bg)
  const ink = pal.ink
  const paper = pal.bg
  const ghost = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'

  const padX = Math.round(ww * 0.075)
  const padY = Math.round(ww * 0.075)
  const innerW = ww - padX * 2
  const artBottom = Math.round(hh * 0.44)
  const ghostOffset = Math.max(2, Math.round(ww * 0.012))

  const scrimGradient = `linear-gradient(180deg,
    ${lpPaperRgb(paper, 0)} 0%,
    ${lpPaperRgb(paper, 0)} ${Math.round(((artBottom - padY * 1.5) / hh) * 100)}%,
    ${lpPaperRgb(paper, 0.85)} ${Math.round((artBottom / hh) * 100)}%,
    ${lpPaperRgb(paper, 1)} ${Math.min(96, Math.round(((artBottom + padY) / hh) * 100))}%,
    ${lpPaperRgb(paper, 1)} 100%)`

  const lines = lpSmartBreak(show.artist || '', 3)
  const titleMax = Math.round(ww * 0.22)
  const titleMin = Math.max(16, Math.round(ww * 0.085))
  const titleSize = lpAutoFit(lines, innerW, titleMax, titleMin)

  const venueSize = Math.max(10, Math.round(ww * 0.052))
  const eyebrowSize = Math.max(8, Math.round(ww * 0.032))
  const dateRowSize = Math.max(9, Math.round(ww * 0.038))

  const cityDisplay = (show.city || '').split(',')[0] || 'Denver'

  return (
    <div
      style={{
        width: ww,
        height: hh,
        position: 'relative',
        overflow: 'hidden',
        background: paper,
        border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
        boxShadow: `
          0 ${Math.round(ww * 0.1)}px ${Math.round(ww * 0.18)}px -${Math.round(ww * 0.08)}px rgba(0,0,0,0.45),
          0 ${Math.round(ww * 0.04)}px ${Math.round(ww * 0.08)}px -${Math.round(ww * 0.04)}px rgba(0,0,0,0.30)
        `,
        color: ink,
        isolation: 'isolate',
      }}
    >
      {/* Full-bleed identity art */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <IdentityArt
          name={show.artist}
          kind="artist"
          scale="hero"
          showInitials={false}
          grain={grain}
          width={ww}
          height={hh}
        />
      </div>

      {/* Top chrome — eyebrow (left) + state pill (right) */}
      <div
        style={{
          position: 'absolute',
          left: padX,
          right: padX,
          top: padY,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: padX,
          zIndex: 2,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: Math.round(ww * 0.018),
            padding: `${Math.round(ww * 0.014)}px ${Math.round(ww * 0.028)}px`,
            background: lpPaperRgb(paper, 0.85),
            color: ink,
            borderRadius: 999,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: eyebrowSize,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
          }}
        >
          {cityDisplay}
        </span>
        <LPStatePill state={show.state} ink={ink} paper={paper} ww={ww} />
      </div>

      {/* Bottom paper scrim */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: scrimGradient,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Bottom block */}
      <div
        style={{
          position: 'absolute',
          left: padX,
          right: padX,
          bottom: padY,
          display: 'flex',
          flexDirection: 'column',
          gap: Math.round(ww * 0.025),
          zIndex: 2,
        }}
      >
        {/* Date row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: Math.round(ww * 0.025),
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: dateRowSize,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: ink,
            opacity: 0.88,
            lineHeight: 1,
          }}
        >
          <span>{show.dateShort}</span>
          <span style={{ opacity: 0.55 }}>·</span>
          <span>{show.showTime}</span>
        </div>

        {/* Artist title — mis-registered ghost + ink */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: ghostOffset,
              top: ghostOffset,
              pointerEvents: 'none',
            }}
          >
            {lines.map((line, ii) => (
              <span
                key={`g-${ii}`}
                style={{
                  display: 'block',
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 900,
                  fontSize: titleSize,
                  lineHeight: 0.86,
                  letterSpacing: '-0.045em',
                  textTransform: 'uppercase',
                  color: ghost,
                  wordBreak: 'keep-all',
                }}
              >
                {line}
              </span>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            {lines.map((line, ii) => (
              <span
                key={`k-${ii}`}
                style={{
                  display: 'block',
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 900,
                  fontSize: titleSize,
                  lineHeight: 0.86,
                  letterSpacing: '-0.045em',
                  textTransform: 'uppercase',
                  color: ink,
                  wordBreak: 'keep-all',
                }}
              >
                {line}
              </span>
            ))}
          </div>
        </div>

        {/* Venue line */}
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 700,
            fontSize: venueSize,
            letterSpacing: '-0.015em',
            color: ink,
            lineHeight: 1.15,
            opacity: 0.92,
            textWrap: 'balance',
          } as React.CSSProperties}
        >
          {show.venue}
          <span style={{ opacity: 0.55 }}> · {cityDisplay}</span>
        </div>

        {/* Opener */}
        {show.opener && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              fontSize: Math.max(9, Math.round(ww * 0.032)),
              letterSpacing: '0.06em',
              color: ink,
              opacity: 0.6,
              textTransform: 'lowercase',
              lineHeight: 1,
              marginTop: Math.round(ww * 0.005),
            }}
          >
            + {show.opener}
          </div>
        )}
      </div>

      <style>{`
        @keyframes lpPulse {
          0%, 100% { opacity: 0.45; transform: scale(0.85); }
          50%       { opacity: 1;    transform: scale(1.15); }
        }
      `}</style>
    </div>
  )
}
