'use client'

interface Show {
  artist: string
  venue: string
  date: string
  time?: string
  opener?: string | null
}

interface Palette {
  field: string
  ink: string
}

const POSTER_PALETTES: Palette[] = [
  { field: '#F25C24', ink: '#0E0E0E' },
  { field: '#1453E5', ink: '#F5F1E4' },
  { field: '#1FA875', ink: '#0A2820' },
  { field: '#E5006E', ink: '#0E0E14' },
  { field: '#FFC400', ink: '#0E0E0E' },
  { field: '#0E1F3D', ink: '#FF6A00' },
  { field: '#7A2EE0', ink: '#F4EFE2' },
  { field: '#0E5C46', ink: '#F2D43B' },
]

function haloColor(hex: string): string {
  const hh = hex.replace('#', '')
  const rr = parseInt(hh.slice(0, 2), 16)
  const gg = parseInt(hh.slice(2, 4), 16)
  const bb = parseInt(hh.slice(4, 6), 16)
  const lum = (0.2126 * rr + 0.7152 * gg + 0.0722 * bb) / 255
  return lum > 0.5 ? '#000000' : '#FFFFFF'
}

function pickPalette(seed: string): Palette {
  const hash = seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return POSTER_PALETTES[hash % POSTER_PALETTES.length]!
}

function smartLineBreak(name: string, maxLines = 3): string[] {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return []
  if (words.length === 1) return [words[0]!]

  const connectors = new Set([
    'THE',
    'AND',
    'OF',
    'A',
    'AN',
    '&',
    'FT',
    'FT.',
    'FEAT',
    'FEAT.',
  ])

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

function autoFitFontSize(
  lines: string[],
  innerWidth: number,
  max = 88,
  min = 28,
): number {
  const longest = lines.reduce((mm, ll) => Math.max(mm, ll.length), 0)
  if (!longest) return min
  const fitted = innerWidth / longest / 0.58
  return Math.max(min, Math.min(max, Math.floor(fitted)))
}

function formatDate(date: string): { pretty: string; dow: string } {
  try {
    const dd = new Date(date + 'T12:00:00')
    const months = [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC',
    ]
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    return {
      pretty: `${months[dd.getMonth()]} ${dd.getDate()}`,
      dow: days[dd.getDay()]!,
    }
  } catch {
    return { pretty: date, dow: '' }
  }
}

interface GigPosterProps {
  show: Show
  width?: number
  height?: number
  palette?: Palette
}

export function GigPoster({
  show,
  width = 320,
  height = 460,
  palette,
}: GigPosterProps) {
  const pal = palette ?? pickPalette(show.artist)
  const halo = haloColor(pal.ink)
  const { pretty: prettyDate, dow } = formatDate(show.date)
  const padX = Math.round(width * 0.07)
  const typeMaxW = Math.round(width * 0.6) - padX
  const lines = smartLineBreak(show.artist || '', 3)
  const fontSize = autoFitFontSize(
    lines,
    typeMaxW,
    Math.round(width * 0.24),
    24,
  )
  const shapeIdx = String(show.artist || 'x').charCodeAt(0) % 4
  const haloshadow = `-1px -1px 0 ${halo}, 1px -1px 0 ${halo}, -1px 1px 0 ${halo}, 1px 1px 0 ${halo}`

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        background: pal.field,
        boxShadow:
          '0 1px 0 rgba(0,0,0,0.08) inset, 0 30px 60px -20px rgba(0,0,0,0.55), 0 12px 24px -12px rgba(0,0,0,0.35)',
        overflow: 'hidden',
        border: `1px solid ${pal.ink}`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden
      >
        {shapeIdx === 0 && (
          <path
            d={`M ${width * 0.55} ${height * 0.14} C ${width * 0.8} ${height * 0.16}, ${width * 1.05} ${height * 0.24}, ${width * 1.02} ${height * 0.4} C ${width * 0.98} ${height * 0.55}, ${width * 0.68} ${height * 0.5}, ${width * 0.65} ${height * 0.62} C ${width * 0.62} ${height * 0.74}, ${width * 0.92} ${height * 0.78}, ${width * 0.85} ${height * 0.62} C ${width * 0.78} ${height * 0.45}, ${width * 0.6} ${height * 0.4}, ${width * 0.55} ${height * 0.14} Z`}
            fill={pal.ink}
            opacity="0.95"
          />
        )}
        {shapeIdx === 1 && (
          <g fill={pal.ink} opacity="0.92">
            <rect
              x={width * 0.55}
              y={height * 0.18}
              width={width * 0.18}
              height={height * 0.05}
            />
            <rect
              x={width * 0.78}
              y={height * 0.18}
              width={width * 0.22}
              height={height * 0.05}
            />
            <rect
              x={width * 0.55}
              y={height * 0.26}
              width={width * 0.3}
              height={height * 0.05}
            />
            <rect
              x={width * 0.9}
              y={height * 0.26}
              width={width * 0.1}
              height={height * 0.05}
            />
            <rect
              x={width * 0.55}
              y={height * 0.34}
              width={width * 0.15}
              height={height * 0.05}
            />
            <rect
              x={width * 0.75}
              y={height * 0.34}
              width={width * 0.25}
              height={height * 0.05}
            />
            <rect
              x={width * 0.55}
              y={height * 0.42}
              width={width * 0.45}
              height={height * 0.05}
            />
          </g>
        )}
        {shapeIdx === 2 && (
          <circle
            cx={width * 0.92}
            cy={height * 0.5}
            r={width * 0.42}
            fill={pal.ink}
            opacity="0.95"
          />
        )}
        {shapeIdx === 3 && (
          <g fill={pal.ink} opacity="0.95">
            <path
              d={`M ${width * 0.5} ${height * 0.18} L ${width * 1.02} ${height * 0.18} L ${width * 1.02} ${height * 0.32} L ${width * 0.5} ${height * 0.48} Z`}
            />
            <circle cx={width * 0.82} cy={height * 0.65} r={width * 0.14} />
          </g>
        )}
      </svg>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          padding: `${Math.round(height * 0.045)}px ${padX}px 0`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: Math.max(10, Math.round(width * 0.034)),
          color: pal.ink,
          letterSpacing: '0.10em',
          textTransform: 'lowercase',
          fontWeight: 600,
          textShadow: haloshadow,
        }}
      >
        <span>
          {dow.toLowerCase()} · {prettyDate.toLowerCase()} · {show.time ?? ''}
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${padX}px`,
          marginTop: -Math.round(height * 0.04),
        }}
      >
        {lines.map((line, ii) => (
          <span
            key={ii}
            style={{
              display: 'block',
              fontFamily: "'Inter', system-ui",
              fontWeight: 900,
              fontSize,
              lineHeight: 0.92,
              letterSpacing: '-0.045em',
              textTransform: 'uppercase',
              color: pal.ink,
              wordBreak: 'keep-all',
              maxWidth: typeMaxW,
              textShadow: haloshadow,
            }}
          >
            {line}
          </span>
        ))}
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          padding: `0 ${padX}px ${Math.round(height * 0.06)}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {show.opener && (
          <span
            style={{
              fontFamily: "'Caveat', cursive, 'Inter', system-ui",
              fontWeight: 600,
              fontSize: Math.max(14, Math.round(width * 0.05)),
              color: pal.ink,
              opacity: 0.9,
              lineHeight: 1.0,
              textShadow: haloshadow,
            }}
          >
            + {show.opener}
          </span>
        )}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: Math.max(10, Math.round(width * 0.032)),
            color: pal.ink,
            letterSpacing: '0.06em',
            textTransform: 'lowercase',
            fontWeight: 600,
            opacity: 0.85,
            textShadow: haloshadow,
          }}
        >
          {show.venue.toLowerCase()}
        </span>
      </div>
    </div>
  )
}

export { pickPalette }
export type { Show, Palette }
