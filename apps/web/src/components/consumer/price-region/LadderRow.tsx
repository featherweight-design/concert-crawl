'use client'

// Shared LadderRow primitive used by `FaceValueCard` (two rows: resale + ghost
// box-office) and `ContributeFaceValueCard` (single ghost box-office row).
// Both components want IDENTICAL row geometry, so the helper is extracted
// here rather than duplicated.
//
// Visual spec: property table §1 lines 121–172 + Appendix A.1 lines 802–810.
// The box-office star uses the 12×12 viewBox + `TIER_MARK_STAR_PATH` per the
// property-table lock — NOT the chip-scale `StarGlyph` (10×10) from
// `consumer/glyphs.tsx`. The two stars coexist intentionally; see the comment
// on `TierMark` in glyphs.tsx for the rationale.

export const TIER_COLOR_RESALE = 'oklch(0.65 0.20 25)'
export const TIER_COLOR_BOXOFFICE = 'oklch(0.66 0.14 78)'

const TIER_MARK_STAR_PATH =
  'M6 0.8l1.5 3.1 3.4.5-2.5 2.4.6 3.4L6 8.9 2.9 10.6l.6-3.4L1 4.4l3.4-.5z'

export interface LadderRowProps {
  kind: 'resale' | 'boxoffice'
  label: string
  sub: string
  right: string
  ghost: boolean
}

export const LadderRow = ({
  kind,
  label,
  sub,
  right,
  ghost,
}: LadderRowProps) => {
  const color = kind === 'boxoffice' ? TIER_COLOR_BOXOFFICE : TIER_COLOR_RESALE
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '12px 14px',
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          borderRadius: 5,
          background: `color-mix(in oklab, ${color} ${ghost ? 10 : 18}%, transparent)`,
          border: ghost
            ? `1px dashed color-mix(in oklab, ${color} 55%, transparent)`
            : `1px solid color-mix(in oklab, ${color} 45%, transparent)`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {kind === 'boxoffice' ? (
          <svg
            width={9}
            height={9}
            viewBox="0 0 12 12"
            fill={color}
            aria-hidden
            style={{ flexShrink: 0 }}
          >
            <path d={TIER_MARK_STAR_PATH} />
          </svg>
        ) : (
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: color,
              display: 'inline-block',
            }}
          />
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontWeight: 700,
            fontSize: 13.5,
            color: ghost ? 'var(--fg-muted)' : 'var(--fg)',
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui',
            fontSize: 11.5,
            fontWeight: 500,
            color: 'var(--fg-subtle)',
            letterSpacing: '-0.005em',
          }}
        >
          {sub}
        </div>
      </div>
      <div
        style={
          ghost
            ? {
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                fontSize: 9.5,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: `color-mix(in oklab, ${color} 90%, var(--fg-subtle))`,
                textAlign: 'right',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }
            : {
                fontFamily: 'Inter, system-ui',
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: '-0.015em',
                color: 'var(--fg)',
                textAlign: 'right',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }
        }
      >
        {right}
      </div>
    </div>
  )
}
