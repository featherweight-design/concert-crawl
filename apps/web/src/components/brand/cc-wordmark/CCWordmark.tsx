interface CCWordmarkProps {
  size?: number
  className?: string
}

export function CCWordmark({ size = 28, className }: CCWordmarkProps) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'Inter, system-ui',
        fontWeight: 900,
        fontSize: size,
        letterSpacing: '-0.025em',
        color: 'var(--fg)',
        lineHeight: 1,
      }}
    >
      concert<span style={{ color: 'var(--accent)' }}>crawl.</span>
    </span>
  )
}
