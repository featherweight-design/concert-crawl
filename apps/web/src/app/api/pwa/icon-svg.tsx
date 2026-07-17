// Icons are deterministic from code and only change on deploy; cache a day,
// serve stale up to a week while revalidating so redesigns still propagate.
export const PWA_ICON_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
}

export const PWA_ICON_PALETTE = {
  canvas: '#070A1A',
  background: '#171D3A',
  signalOuter: '#FF7BD4',
  signalInner: '#7AE6FF',
  dot: '#E8F3FF',
} as const

// The art is authored in a square viewBox of this many units.
const ICON_VIEWBOX = 48
// Maskable icons must keep their art inside a centered "safe zone"; platforms
// may crop the outer margin into any shape. The inset is half the cropped
// margin, applied on each side, so the scaled art stays centered.
const MASKABLE_SAFE_ZONE_SCALE = 0.8
const MASKABLE_INSET = (ICON_VIEWBOX * (1 - MASKABLE_SAFE_ZONE_SCALE)) / 2

interface PwaIconSvgProps {
  size: number
  maskable?: boolean
}

export function PwaIconSvg({ size, maskable = false }: PwaIconSvgProps) {
  // Maskable: full-bleed canvas + art inset into the safe zone. Order matters:
  // `translate` before `scale` composes as T·S, so the geometry scales first and
  // the inset is applied in unscaled units — keeping the art centered (equal
  // MASKABLE_INSET margins). Swapping to scale-then-translate would shrink the
  // inset and push the art off-center.
  const artTransform = maskable
    ? `translate(${MASKABLE_INSET} ${MASKABLE_INSET}) scale(${MASKABLE_SAFE_ZONE_SCALE})`
    : undefined
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
        fill={PWA_ICON_PALETTE.canvas}
      />
      {maskable && (
        <rect
          width={ICON_VIEWBOX}
          height={ICON_VIEWBOX}
          fill={PWA_ICON_PALETTE.background}
        />
      )}
      <g transform={artTransform}>
        {!maskable && (
          <rect
            width={ICON_VIEWBOX}
            height={ICON_VIEWBOX}
            rx="10"
            fill={PWA_ICON_PALETTE.background}
          />
        )}
        {/* Signal ring */}
        <circle
          cx="34"
          cy="14"
          r="9"
          fill={PWA_ICON_PALETTE.signalOuter}
          opacity="0.22"
        />
        <circle
          cx="34"
          cy="14"
          r="5"
          fill={PWA_ICON_PALETTE.signalOuter}
          opacity="0.45"
        />
        <circle cx="34" cy="14" r="3" fill={PWA_ICON_PALETTE.signalInner} />
        {/* Dot trail */}
        <circle
          cx="14"
          cy="38"
          r="1.6"
          fill={PWA_ICON_PALETTE.dot}
          opacity="0.45"
        />
        <circle
          cx="18"
          cy="34"
          r="1.6"
          fill={PWA_ICON_PALETTE.dot}
          opacity="0.52"
        />
        <circle
          cx="22"
          cy="30"
          r="1.6"
          fill={PWA_ICON_PALETTE.dot}
          opacity="0.59"
        />
        <circle
          cx="26"
          cy="26"
          r="1.6"
          fill={PWA_ICON_PALETTE.dot}
          opacity="0.66"
        />
        <circle
          cx="30"
          cy="22"
          r="1.6"
          fill={PWA_ICON_PALETTE.dot}
          opacity="0.73"
        />
        <circle
          cx="34"
          cy="18"
          r="1.6"
          fill={PWA_ICON_PALETTE.dot}
          opacity="0.80"
        />
        <circle
          cx="14"
          cy="32"
          r="1.6"
          fill={PWA_ICON_PALETTE.dot}
          opacity="0.87"
        />
      </g>
    </svg>
  )
}
