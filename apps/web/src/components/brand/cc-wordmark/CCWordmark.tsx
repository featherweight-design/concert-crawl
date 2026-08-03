import { BRAND_COPY } from '@/components/brand/definitions/copy'

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
      {BRAND_COPY.wordmark.lead}
      <span style={{ color: 'var(--accent)' }}>
        {BRAND_COPY.wordmark.accent}
      </span>
    </span>
  )
}
