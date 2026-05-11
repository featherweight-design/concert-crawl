import type { AvatarColor } from '@concert-crawl/types'

interface AvatarProps {
  handle: string | null
  avatarColor: AvatarColor | null
  size?: number
  className?: string
}

export function Avatar({
  handle,
  avatarColor,
  size = 56,
  className,
}: AvatarProps) {
  const letter = handle ? handle.charAt(0).toUpperCase() : '?'
  const isAnonymous = !handle
  const fontSize = Math.round(size * 0.4)

  const tone = avatarColor ?? 'signal'
  const tintBg = `color-mix(in oklch, var(--${tone}) 22%, var(--surface-1))`
  const tintBorder = `1.5px solid color-mix(in oklch, var(--${tone}) 50%, transparent)`

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
        background: isAnonymous ? 'var(--surface-2)' : tintBg,
        border: isAnonymous ? '1px dashed var(--border-strong)' : tintBorder,
        color: isAnonymous ? 'var(--fg-subtle)' : `var(--${tone})`,
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
