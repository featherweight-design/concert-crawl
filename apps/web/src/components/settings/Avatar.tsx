import type { AvatarColor } from '@concert-crawl/types'

interface AvatarProps {
  handle: string | null
  avatarColor: AvatarColor | null
  size?: number
  className?: string
}

const COLOR_VAR: Record<AvatarColor, string> = {
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
}

export function Avatar({
  handle,
  avatarColor,
  size = 56,
  className,
}: AvatarProps) {
  const letter = handle ? handle.charAt(0).toUpperCase() : '?'
  const isAnonymous = !handle

  const bgColor = avatarColor ? COLOR_VAR[avatarColor] : undefined
  const fontSize = Math.round(size * 0.4)

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: isAnonymous
          ? 'transparent'
          : (bgColor ?? 'var(--surface-2)'),
        border: isAnonymous ? '2px dashed var(--fg-subtle)' : 'none',
        color: isAnonymous ? 'var(--fg-subtle)' : 'var(--bg)',
        fontSize,
        fontWeight: 800,
        fontFamily: 'var(--font-ui)',
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {letter}
    </div>
  )
}
