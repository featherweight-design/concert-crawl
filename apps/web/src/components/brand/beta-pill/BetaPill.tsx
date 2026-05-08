export function BetaPill() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 999,
        background: 'var(--surface-2)',
        border: '1px solid var(--border-strong)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--fg-muted)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: 'var(--signal)',
          boxShadow: '0 0 8px var(--signal)',
        }}
      />
      Private Beta
    </span>
  )
}
