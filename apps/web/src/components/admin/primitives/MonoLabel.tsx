interface MonoLabelProps {
  children: React.ReactNode
  color?: string
  /**
   * Overrides the 10px default. The triage panel's desktop persistence
   * column uses 9 to sit under the value it labels without competing.
   */
  size?: number
}

export const MonoLabel = ({ children, color, size = 10 }: MonoLabelProps) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: size,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      color: color ?? 'var(--fg-subtle)',
    }}
  >
    {children}
  </span>
)
