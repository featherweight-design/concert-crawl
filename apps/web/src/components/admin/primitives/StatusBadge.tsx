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
  /**
   * Forwarded to the rendered span for mouse-hover context. Optional.
   */
  title?: string
  /**
   * Forwarded to the rendered span. Optional. We deliberately don't
   * override the implicit role — adding role="img" on a text badge
   * causes screen readers to announce it as a graphic, which is
   * semantically wrong. Accessible-name exposure on aria-label-decorated
   * spans is widely-supported in modern AT despite the implicit
   * role="generic"; if support gaps appear we'd promote to a role with
   * named accessibility semantics (e.g. role="status") rather than
   * misrepresent the element as an image.
   */
  'aria-label'?: string
}

export const StatusBadge = ({
  kind = 'neutral',
  variant = 'soft',
  mono = false,
  dot = false,
  children,
  title,
  'aria-label': ariaLabel,
}: StatusBadgeProps) => {
  const colors = KIND_COLORS[kind]
  const isMono = variant === 'mono' || mono
  const isOutline = variant === 'outline'

  return (
    <span
      {...(title !== undefined && { title })}
      {...(ariaLabel !== undefined && { 'aria-label': ariaLabel })}
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
