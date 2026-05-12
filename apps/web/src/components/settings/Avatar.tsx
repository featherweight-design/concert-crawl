import type { AvatarColor } from '@concert-crawl/types'

interface AvatarProps {
  handle: string | null
  avatarColor: AvatarColor | null
  size?: number
  ringed?: boolean
  className?: string
}

export function Avatar({
  handle,
  avatarColor,
  size = 56,
  ringed = false,
  className,
}: AvatarProps) {
  const letter = handle ? handle.charAt(0).toUpperCase() : '?'
  const isAnonymous = !handle
  const fontSize = Math.round(size * 0.46)

  const tone = avatarColor ?? 'signal'
  const tintBg = `color-mix(in oklch, var(--${tone}) 22%, var(--surface-1))`
  const tintBorder = `1.5px solid color-mix(in oklch, var(--${tone}) 50%, transparent)`
  const ringStyle =
    ringed && !isAnonymous
      ? `0 0 0 3px color-mix(in oklch, var(--${tone}) 14%, transparent)`
      : undefined

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
        boxShadow: ringStyle,
        color: isAnonymous ? 'var(--fg-subtle)' : `var(--${tone})`,
        fontSize,
        fontWeight: 800,
        fontFamily: 'var(--font-ui)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {letter}
    </div>
  )
}
