export function Eyebrow({
  children,
  tone = 'signal',
}: {
  children: React.ReactNode
  tone?: 'signal' | 'accent'
}) {
  return (
    <div
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 700,
        color: tone === 'accent' ? 'var(--accent)' : 'var(--signal)',
      }}
    >
      {children}
    </div>
  )
}

export function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        margin: 0,
        fontFamily: 'Inter, system-ui',
        fontWeight: 900,
        fontSize: 34,
        letterSpacing: '-0.03em',
        lineHeight: 1.05,
        color: 'var(--fg)',
      }}
    >
      {children}
    </h1>
  )
}

export function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: 'Inter, system-ui',
        fontSize: 15,
        lineHeight: 1.55,
        color: 'var(--fg-muted)',
        letterSpacing: '-0.005em',
      }}
    >
      {children}
    </p>
  )
}
