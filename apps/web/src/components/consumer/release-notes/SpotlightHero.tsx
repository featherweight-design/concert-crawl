'use client'

interface SpotlightHeroProps {
  hero?: string
  compact?: boolean
}

export function SpotlightHero({
  hero = 'map',
  compact = false,
}: SpotlightHeroProps) {
  if (hero === 'map') return <MapHero compact={compact} />
  return null
}

const MAP_PINS = [
  { x: '28%', y: '55%', color: 'var(--signal)', delay: '0.1s' },
  { x: '55%', y: '35%', color: 'var(--accent)', delay: '0.5s' },
  { x: '70%', y: '60%', color: 'var(--success)', delay: '0.9s' },
  { x: '40%', y: '70%', color: 'var(--warning)', delay: '1.3s' },
  { x: '62%', y: '25%', color: 'var(--signal)', delay: '1.7s' },
  { x: '20%', y: '38%', color: 'var(--accent)', delay: '2.1s' },
  { x: '82%', y: '44%', color: 'var(--success)', delay: '2.5s' },
]

function MapHero({ compact }: { compact: boolean }) {
  const pinSize = compact ? 18 : 22
  const pinHeight = compact ? 24 : 28

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background:
          'radial-gradient(ellipse at 30% 40%, var(--surface-3), var(--surface-1) 70%)',
        overflow: 'hidden',
      }}
    >
      {/* parallax drift layer */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          animation: 'rnDrift 18s ease-in-out infinite alternate',
        }}
      >
        {/* city grid SVG */}
        <svg
          width="120%"
          height="120%"
          viewBox="0 0 400 300"
          style={{ position: 'absolute', inset: 0 }}
          aria-hidden
        >
          {[50, 100, 150, 200, 250, 300, 350].map((xVal) => (
            <line
              key={`v${xVal}`}
              x1={xVal}
              y1={0}
              x2={xVal}
              y2={300}
              stroke="var(--border)"
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}
          {[50, 100, 150, 200, 250].map((yVal) => (
            <line
              key={`h${yVal}`}
              x1={0}
              y1={yVal}
              x2={400}
              y2={yVal}
              stroke="var(--border)"
              strokeWidth="0.5"
              opacity="0.6"
            />
          ))}
          {/* river */}
          <path
            d="M 0 180 Q 80 160 140 175 Q 200 190 260 170 Q 320 150 400 165"
            fill="none"
            stroke="var(--signal)"
            strokeWidth="3"
            opacity="0.15"
          />
          {/* roads */}
          <path
            d="M 0 100 L 400 100"
            fill="none"
            stroke="var(--fg-subtle)"
            strokeWidth="1"
            opacity="0.25"
          />
          <path
            d="M 200 0 L 200 300"
            fill="none"
            stroke="var(--fg-subtle)"
            strokeWidth="1"
            opacity="0.25"
          />
          <path
            d="M 0 230 Q 120 210 260 225 L 400 220"
            fill="none"
            stroke="var(--fg-subtle)"
            strokeWidth="0.8"
            opacity="0.18"
          />
        </svg>

        {/* pins */}
        {MAP_PINS.map((pin, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: pin.x,
              top: pin.y,
              transform: 'translate(-50%, -100%)',
              animation: `rnPinDrop 0.5s cubic-bezier(.2,.8,.2,1) ${pin.delay} both`,
            }}
          >
            {idx === MAP_PINS.length - 1 && (
              <span
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 'calc(100% - 4px)',
                  width: 12,
                  height: 12,
                  marginLeft: -6,
                  marginTop: -6,
                  borderRadius: 12,
                  background: pin.color,
                  opacity: 0.4,
                  animation: 'rnRadar 1.8s ease-out infinite',
                }}
              />
            )}
            <svg
              width={pinSize}
              height={pinHeight}
              viewBox="0 0 22 28"
              aria-hidden
              style={{
                filter: `drop-shadow(0 0 6px ${pin.color}) drop-shadow(0 4px 6px rgba(0,0,0,0.4))`,
              }}
            >
              <path
                d="M11 1 C 5 1 1 5 1 11 C 1 17 11 27 11 27 C 11 27 21 17 21 11 C 21 5 17 1 11 1 Z"
                fill="var(--bg-elevated)"
                stroke={pin.color}
                strokeWidth="1.5"
              />
              <circle cx="11" cy="11" r="3.5" fill={pin.color} />
            </svg>
          </div>
        ))}
      </div>

      {!compact && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            left: 14,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          39.7°N · 104.9°W · Denver
        </div>
      )}
    </div>
  )
}
