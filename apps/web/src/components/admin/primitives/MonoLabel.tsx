interface MonoLabelProps {
  children: React.ReactNode
  color?: string
}

export const MonoLabel = ({ children, color }: MonoLabelProps) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: color ?? 'var(--fg-subtle)',
    }}
  >
    {children}
  </span>
)
