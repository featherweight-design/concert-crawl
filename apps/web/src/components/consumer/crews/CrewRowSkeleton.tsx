const shimmer: React.CSSProperties = {
  display: 'block',
  flexShrink: 0,
  background:
    'linear-gradient(90deg, var(--surface-1) 0%, var(--surface-2) 50%, var(--surface-1) 100%)',
  backgroundSize: '200% 100%',
  animation: 'ccShimmer 1.3s ease-in-out infinite',
}

interface ShimmerProps {
  width: number | string
  height: number
  radius?: number
}

export const Shimmer = ({ width, height, radius = 6 }: ShimmerProps) => (
  <span
    aria-hidden="true"
    style={{ ...shimmer, width, height, borderRadius: radius }}
  />
)

/** Shared keyframes, rendered once per list rather than per row. */
export const ShimmerKeyframes = () => (
  <style>
    {
      "@keyframes ccShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@media (prefers-reduced-motion:reduce){[style*='ccShimmer']{animation:none!important}}"
    }
  </style>
)

/**
 * The loading row. It matches CrewRow's geometry exactly so nothing shifts on
 * resolve, and it deliberately shows neither a name nor a patch: both would be
 * guesses, and a patch especially must never flash the wrong identity.
 */
export const CrewRowSkeleton = ({ wide }: { wide: boolean }) => (
  <div
    aria-hidden="true"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: wide ? 15 : 13,
      padding: wide ? '13px 15px' : '11px 12px',
      borderRadius: 12,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      minHeight: 64,
    }}
  >
    <Shimmer width={wide ? 54 : 48} height={wide ? 54 : 48} radius={14} />
    <span
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      <Shimmer width="52%" height={13} />
      <Shimmer width="31%" height={9} />
    </span>
    <Shimmer width={64} height={24} radius={99} />
  </div>
)
