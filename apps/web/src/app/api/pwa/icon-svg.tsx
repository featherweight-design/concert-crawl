export const PWA_ICON_PALETTE = {
  canvas: '#070A1A',
  background: '#171D3A',
  signalOuter: '#FF7BD4',
  signalInner: '#7AE6FF',
  dot: '#E8F3FF',
} as const

interface PwaIconSvgProps {
  size: number
  maskable?: boolean
}

export function PwaIconSvg({ size, maskable = false }: PwaIconSvgProps) {
  // Maskable: full-bleed canvas + art inset into the 80% safe zone.
  const artTransform = maskable ? 'translate(4.8 4.8) scale(0.8)' : undefined
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" fill={PWA_ICON_PALETTE.canvas} />
      {maskable && (
        <rect width="48" height="48" fill={PWA_ICON_PALETTE.background} />
      )}
      <g transform={artTransform}>
        {!maskable && (
          <rect
            width="48"
            height="48"
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
