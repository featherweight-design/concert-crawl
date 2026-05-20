// Sketch primitives — wobbly rectangles, hand-drawn lines, placeholder fills.
// All use SVG so they scale and look intentionally hand-drawn at any size.

const ink = 'var(--ink)'
const paper = 'var(--paper)'
const muted = 'var(--muted)'
const accent = 'var(--accent)'

// Generate a slightly-wobbly rectangle path for hand-drawn feel
function wobblyRect(w, h, r = 6, jitter = 0.8, seed = 1) {
  // deterministic pseudo-random based on seed
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const j = () => (rand() - 0.5) * jitter * 2
  const x0 = j(),
    y0 = j(),
    x1 = w + j(),
    y1 = h + j()
  return `M ${x0 + r} ${y0}
    L ${x1 - r} ${y0 + j()}
    Q ${x1} ${y0} ${x1 + j()} ${y0 + r}
    L ${x1 + j()} ${y1 - r}
    Q ${x1} ${y1} ${x1 - r} ${y1 + j()}
    L ${x0 + r} ${y1 + j()}
    Q ${x0} ${y1} ${x0 + j()} ${y1 - r}
    L ${x0 + j()} ${y0 + r}
    Q ${x0} ${y0} ${x0 + r} ${y0}
    Z`
}

// Hand-drawn rectangle frame
function SketchBox({
  width,
  height,
  radius = 6,
  stroke = ink,
  fill = 'none',
  strokeWidth = 1.5,
  seed = 1,
  style,
  children,
  className,
  dashed = false,
}) {
  return (
    <div
      className={className}
      style={{ position: 'relative', width, height, ...style }}
    >
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <path
          d={wobblyRect(width, height, radius, 0.7, seed)}
          stroke={stroke}
          fill={fill}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={dashed ? '4 3' : undefined}
        />
      </svg>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  )
}

// Diagonal-stripe placeholder for "image goes here"
function StripePlaceholder({ width, height, label, seed = 1, dense = false }) {
  const id = `stripe-${seed}-${Math.random().toString(36).slice(2, 7)}`
  return (
    <div style={{ position: 'relative', width, height }}>
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <pattern
            id={id}
            width={dense ? 6 : 10}
            height={dense ? 6 : 10}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2={dense ? 6 : 10}
              stroke={muted}
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <path
          d={wobblyRect(width, height, 4, 0.5, seed)}
          fill={`url(#${id})`}
          stroke={muted}
          strokeWidth="1"
        />
      </svg>
      {label && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: muted,
            textAlign: 'center',
            padding: 8,
            letterSpacing: '0.04em',
            textTransform: 'lowercase',
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}

// Squiggly line for "text goes here"
function Squiggle({ width, height = 6, seed = 1, color = ink, weight = 1.5 }) {
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const segs = Math.max(3, Math.floor(width / 14))
  const pts = []
  for (let i = 0; i <= segs; i++) {
    const x = (i / segs) * width
    const y = height / 2 + (rand() - 0.5) * 1.5
    pts.push([x, y])
  }
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i]
    const [px, py] = pts[i - 1]
    const cx = (px + x) / 2
    d += ` Q ${cx} ${py} ${x} ${y}`
  }
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path
        d={d}
        stroke={color}
        strokeWidth={weight}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Text-as-lines: rows of squiggles to indicate copy
function TextLines({ width, lines = 3, seed = 1, gap = 8, lastShort = true }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => {
        const w = lastShort && i === lines - 1 ? width * 0.55 : width
        return <Squiggle key={i} width={w} seed={seed + i * 7} />
      })}
    </div>
  )
}

// Hand-printed label (Caveat font)
function Hand({
  children,
  size = 16,
  color = ink,
  style,
  rotate = 0,
  weight = 500,
}) {
  return (
    <span
      style={{
        fontFamily: 'var(--hand)',
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.1,
        display: 'inline-block',
        transform: rotate ? `rotate(${rotate}deg)` : undefined,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// Real UI text (Inter), used sparingly when we want to communicate clearly
function UI({ children, size = 13, color = ink, weight = 500, style }) {
  return (
    <span
      style={{
        fontFamily: 'var(--ui)',
        fontSize: size,
        color,
        fontWeight: weight,
        letterSpacing: '-0.005em',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// Small monospace caption (e.g. "venue logo", placeholder labels)
function Mono({ children, size = 10, color = muted, style }) {
  return (
    <span
      style={{
        fontFamily: 'var(--mono)',
        fontSize: size,
        color,
        letterSpacing: '0.04em',
        textTransform: 'lowercase',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// Margin annotation arrow + handwritten note. Places itself absolutely.
function Annotation({
  x,
  y,
  note,
  arrow = 'left',
  width = 140,
  rotate = -3,
  color = 'var(--note)',
}) {
  const arrowPaths = {
    left: 'M 0 8 Q 12 14 22 6 L 22 6 M 18 2 L 22 6 L 18 10',
    right: 'M 30 8 Q 18 14 8 6 M 12 2 L 8 6 L 12 10',
    down: 'M 8 0 Q 14 12 6 22 M 2 18 L 6 22 L 10 18',
    up: 'M 8 22 Q 14 10 6 0 M 2 4 L 6 0 L 10 4',
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 4,
          transform: `rotate(${rotate}deg)`,
          transformOrigin: 'left top',
        }}
      >
        {arrow === 'left' && (
          <svg width={28} height={16} style={{ flexShrink: 0, marginTop: 4 }}>
            <path
              d={arrowPaths.left}
              stroke={color}
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        <span
          style={{
            fontFamily: 'var(--hand)',
            fontSize: 14,
            color,
            lineHeight: 1.15,
            fontWeight: 500,
          }}
        >
          {note}
        </span>
        {arrow === 'right' && (
          <svg width={36} height={16} style={{ flexShrink: 0, marginTop: 4 }}>
            <path
              d={arrowPaths.right}
              stroke={color}
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  )
}

// Phone frame — minimal, just a soft outline
function PhoneFrame({ width = 280, height = 580, children, label, seed = 1 }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ position: 'relative', width, height }}>
        <svg
          width={width}
          height={height}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <path
            d={wobblyRect(width, height, 26, 0.5, seed)}
            stroke={ink}
            strokeWidth="1.8"
            fill={paper}
            strokeLinejoin="round"
          />
        </svg>
        {/* notch */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 60,
            height: 4,
            background: ink,
            borderRadius: 4,
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '22px 14px 14px',
            overflow: 'hidden',
            borderRadius: 18,
          }}
        >
          {children}
        </div>
      </div>
      {label && <Mono size={10}>{label}</Mono>}
    </div>
  )
}

// Desktop browser frame — minimal chrome
function DesktopFrame({
  width = 760,
  height = 480,
  children,
  label,
  seed = 1,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <div style={{ position: 'relative', width, height }}>
        <svg
          width={width}
          height={height}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <path
            d={wobblyRect(width, height, 8, 0.5, seed)}
            stroke={ink}
            strokeWidth="1.8"
            fill={paper}
            strokeLinejoin="round"
          />
          <line
            x1="0"
            y1="28"
            x2={width}
            y2="28"
            stroke={ink}
            strokeWidth="1"
            opacity="0.4"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            display: 'flex',
            gap: 6,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 8,
                border: `1px solid ${ink}`,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: '30px 1px 1px',
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
      {label && <Mono size={10}>{label}</Mono>}
    </div>
  )
}

// Status bar pill at the top of mobile screens
function StatusBar() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 14px 2px',
        fontFamily: 'var(--mono)',
        fontSize: 9,
        color: ink,
        opacity: 0.5,
      }}
    >
      <span>9:41</span>
      <span>•••</span>
    </div>
  )
}

// Tab bar (bottom nav)
function TabBar({ active = 0, items = ['browse', 'search', 'saved', 'me'] }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 52,
        borderTop: `1px solid ${ink}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: paper,
      }}
    >
      {items.map((label, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <SketchBox
            width={20}
            height={20}
            radius={4}
            seed={i + 11}
            strokeWidth={1.2}
          />
          <Mono
            size={9}
            color={i === active ? accent : muted}
            style={{ fontWeight: i === active ? 700 : 400 }}
          >
            {label}
          </Mono>
        </div>
      ))}
      {/* underline for active */}
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          left: `${(active + 0.5) * (100 / items.length)}%`,
          transform: 'translateX(-50%)',
          width: 24,
        }}
      >
        <Squiggle
          width={24}
          height={3}
          seed={active + 99}
          color={accent}
          weight={2}
        />
      </div>
    </div>
  )
}

// "Pill" — for filter chips and tags
function Pill({ children, active = false, seed = 1, size = 11 }) {
  const w = String(children).length * size * 0.6 + 18
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        height: size + 12,
        padding: '0 10px',
        lineHeight: `${size + 12}px`,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${size + 12}`}
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0 }}
      >
        <path
          d={wobblyRect(w, size + 12, (size + 12) / 2, 0.4, seed)}
          stroke={ink}
          strokeWidth={active ? 1.8 : 1.2}
          fill={active ? accent : 'none'}
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{
          position: 'relative',
          fontFamily: 'var(--hand)',
          fontSize: size + 2,
          color: ink,
          fontWeight: active ? 700 : 500,
        }}
      >
        {children}
      </span>
    </div>
  )
}

// Calendar dot row — used in calendar / date strip
function DateStrip({ days = 7, activeIdx = 2, withDots = true }) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const nums = [21, 22, 23, 24, 25, 26, 27]
  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 0' }}>
      {Array.from({ length: days }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            position: 'relative',
            textAlign: 'center',
            padding: '6px 0',
          }}
        >
          {i === activeIdx && (
            <svg
              width="100%"
              height="100%"
              style={{ position: 'absolute', inset: 0 }}
              preserveAspectRatio="none"
              viewBox="0 0 40 50"
            >
              <path
                d={wobblyRect(40, 50, 8, 0.4, i + 30)}
                stroke={ink}
                strokeWidth="1.5"
                fill={accent}
              />
            </svg>
          )}
          <div style={{ position: 'relative' }}>
            <Mono size={9}>{labels[i]}</Mono>
            <div style={{ marginTop: 2 }}>
              <Hand size={14} weight={i === activeIdx ? 700 : 500}>
                {nums[i]}
              </Hand>
            </div>
            {withDots && i % 2 === 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'center',
                  marginTop: 3,
                }}
              >
                {Array.from({ length: (i % 3) + 1 }).map((_, k) => (
                  <div
                    key={k}
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: 3,
                      background: ink,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Section divider — a wobbly horizontal line
function HRule({ width = '100%', seed = 1, opacity = 0.4 }) {
  return (
    <div style={{ width, opacity }}>
      <Squiggle
        width={typeof width === 'number' ? width : 300}
        height={4}
        seed={seed}
        weight={1}
      />
    </div>
  )
}

// Highlighter swipe — yellow accent behind text. Uses box-decoration-break
// so it tracks the text on wrapped lines instead of floating.
function Highlight({ children, color = accent }) {
  return (
    <span
      style={{
        background: `linear-gradient(transparent 55%, ${color} 55%, ${color} 92%, transparent 92%)`,
        padding: '0 2px',
        WebkitBoxDecorationBreak: 'clone',
        boxDecorationBreak: 'clone',
      }}
    >
      {children}
    </span>
  )
}

// Make available globally for other JSX files
Object.assign(window, {
  SketchBox,
  StripePlaceholder,
  Squiggle,
  TextLines,
  Hand,
  UI,
  Mono,
  Annotation,
  PhoneFrame,
  DesktopFrame,
  StatusBar,
  TabBar,
  Pill,
  DateStrip,
  HRule,
  Highlight,
  wobblyRect,
})
