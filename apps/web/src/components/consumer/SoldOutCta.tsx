export function SoldOutCta() {
  return (
    <button
      type="button"
      disabled
      aria-label="Sold out"
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        cursor: 'not-allowed',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 48,
        borderRadius: 10,
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        color: 'var(--fg-subtle)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '-0.005em',
      }}
    >
      Sold out
    </button>
  )
}
