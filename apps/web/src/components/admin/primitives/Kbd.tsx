export const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 5px',
      borderRadius: 4,
      background: 'var(--surface-1)',
      border: '1px solid var(--border)',
      color: 'var(--fg-muted)',
    }}
  >
    {children}
  </kbd>
)
