interface MonoLabelProps {
  children: React.ReactNode
}

export const MonoLabel = ({ children }: MonoLabelProps) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: 'var(--fg-subtle)',
    }}
  >
    {children}
  </span>
)
