// Icons are deterministic from code and only change on deploy; cache a day,
// serve stale up to a week while revalidating so redesigns still propagate.
export const PWA_ICON_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
}

// Signature "ClusterPath" mark, electric palette — the locked logo from
// design/design_handoff_brand_and_theming/logo-workshop-5.jsx. Trail dots share
// the signal's cyan (`signal`) and grow toward the halo; the pink glow rings the
// focal point.
export const PWA_ICON_PALETTE = {
  background: '#171D3A',
  glow: '#FF7BD4',
  signal: '#7AE6FF',
} as const

// The art is authored in a square viewBox of this many units — matching the
// canonical ClusterPath source so its coordinates port over verbatim.
const ICON_VIEWBOX = 96
// Maskable icons must keep their art inside a centered "safe zone"; platforms
// may crop the outer margin into any shape. The inset is half the cropped
// margin, applied on each side, so the scaled art stays centered.
const MASKABLE_SAFE_ZONE_SCALE = 0.8
const MASKABLE_INSET = (ICON_VIEWBOX * (1 - MASKABLE_SAFE_ZONE_SCALE)) / 2

// Dots travel along an implied curve, growing toward the focal halo — verbatim
// from the ClusterPath source. Opacity ramps as `0.35 + index * 0.09`, and the
// final r=6 dot overlaps the r=7 core to read as one merged signal.
const TRAIL = [
  { cx: 14, cy: 76, radius: 1.5 },
  { cx: 24, cy: 70, radius: 2 },
  { cx: 34, cy: 64, radius: 2.5 },
  { cx: 42, cy: 58, radius: 3 },
  { cx: 50, cy: 50, radius: 4 },
  { cx: 58, cy: 42, radius: 5 },
  { cx: 66, cy: 32, radius: 6 },
] as const

interface PwaIconSvgProps {
  size: number
  maskable?: boolean
}

export function PwaIconSvg({ size, maskable = false }: PwaIconSvgProps) {
  // Maskable: art inset into the safe zone. Order matters: `translate` before
  // `scale` composes as T·S, so the geometry scales first and the inset is
  // applied in unscaled units — keeping the art centered (equal MASKABLE_INSET
  // margins). Non-maskable uses an explicit identity transform: Satori (next/og)
  // drops the children of a <g> with no transform, blanking the art.
  const artTransform = maskable
    ? `translate(${MASKABLE_INSET} ${MASKABLE_INSET}) scale(${MASKABLE_SAFE_ZONE_SCALE})`
    : 'translate(0 0)'
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        width={ICON_VIEWBOX}
        height={ICON_VIEWBOX}
        fill={PWA_ICON_PALETTE.background}
      />
      <g transform={artTransform}>
        {/* Focal halo */}
        <circle
          cx="72"
          cy="24"
          r="20"
          fill={PWA_ICON_PALETTE.glow}
          opacity="0.22"
        />
        <circle
          cx="72"
          cy="24"
          r="12"
          fill={PWA_ICON_PALETTE.glow}
          opacity="0.42"
        />
        <circle cx="72" cy="24" r="7" fill={PWA_ICON_PALETTE.signal} />
        {/* Dot trail */}
        {TRAIL.map((dot, index) => (
          <circle
            key={index}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.radius}
            fill={PWA_ICON_PALETTE.signal}
            opacity={(0.35 + index * 0.09).toFixed(2)}
          />
        ))}
      </g>
    </svg>
  )
}
