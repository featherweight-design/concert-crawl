interface SectionHeadProps {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export const SectionHead = ({
  eyebrow,
  title,
  subtitle,
  actions,
}: SectionHeadProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    }}
  >
    <div>
      {eyebrow && (
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--fg-subtle)',
            marginBottom: 4,
          }}
        >
          {eyebrow}
        </div>
      )}
      <h1
        style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '-0.025em',
          color: 'var(--fg)',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: 'var(--fg-muted)',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
    {actions && (
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {actions}
      </div>
    )}
  </div>
)
