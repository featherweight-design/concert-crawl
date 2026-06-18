import { KIND_COLORS, type StatusKind } from './utils'

interface StatusBadgeProps {
  kind?: StatusKind
  variant?: 'soft' | 'outline' | 'mono'
  /**
   * Orthogonal mono-font flag. When true, applies mono-font sizing
   * regardless of variant — this lets a caller combine `variant="outline"`
   * with mono typography (e.g. the Missing tab's "missed N sweeps" chip).
   */
  mono?: boolean
  dot?: boolean
  children: React.ReactNode
}

export const StatusBadge = ({
  kind = 'neutral',
  variant = 'soft',
  mono = false,
  dot = false,
  children,
}: StatusBadgeProps) => {
  const colors = KIND_COLORS[kind]
  const isMono = variant === 'mono' || mono
  const isOutline = variant === 'outline'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: isMono ? '2px 6px' : '3px 8px',
        borderRadius: 999,
        fontSize: isMono ? 10 : 11,
        fontWeight: isMono ? 600 : 600,
        fontFamily: isMono
          ? "'JetBrains Mono', monospace"
          : "'Inter', sans-serif",
        letterSpacing: isMono ? '0.02em' : '0.01em',
        textTransform: isMono ? 'lowercase' : undefined,
        color: colors.fg,
        background: isOutline ? 'transparent' : colors.bg,
        border: `1px solid ${isOutline ? colors.border : 'transparent'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: colors.fg,
            flexShrink: 0,
            boxShadow: `0 0 0 3px color-mix(in oklab, ${colors.fg} 22%, transparent)`,
          }}
        />
      )}
      {children}
    </span>
  )
}
