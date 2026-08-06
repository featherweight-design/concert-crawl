// An inline notice: the crew exists and is fine, something about it is just
// worth saying. Deliberately not an EmptyState — a full roster and a crew of
// one are both states with content behind them, and an empty treatment would
// paint over the very thing the customer came to look at.

interface CrewNoticeProps {
  eyebrow: string
  title: string
  body: string
  /** Any theme token name; the dot and the border are tinted from it. */
  tone?: 'signal' | 'warning'
  children?: React.ReactNode
}

export const CrewNotice = ({
  eyebrow,
  title,
  body,
  tone = 'signal',
  children,
}: CrewNoticeProps) => {
  const accent = `var(--${tone})`

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        padding: '16px 16px 15px',
        borderRadius: 12,
        background: 'var(--surface-1)',
        border: `1px solid color-mix(in oklch, ${accent} 28%, var(--border))`,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: accent,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: 6,
            background: accent,
            boxShadow: `0 0 8px ${accent}`,
          }}
        />
        {eyebrow}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: 'var(--fg)',
        }}
      >
        {title}
      </span>
      <span
        style={{
          maxWidth: 380,
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          lineHeight: 1.45,
          color: 'var(--fg-muted)',
        }}
      >
        {body}
      </span>
      {children}
    </div>
  )
}
