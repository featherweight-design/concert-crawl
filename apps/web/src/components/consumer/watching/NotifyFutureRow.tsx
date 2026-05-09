export function NotifyFutureRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        opacity: 0.72,
        position: 'relative',
      }}
    >
      {/* Bell icon */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--surface-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: 'var(--fg-subtle)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 2a7 7 0 00-7 7v4l-2 2v1h18v-1l-2-2V9a7 7 0 00-7-7z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M10 19a2 2 0 004 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--fg-subtle)',
            letterSpacing: '-0.01em',
          }}
        >
          Price drop alerts
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--fg-subtle)',
            letterSpacing: '0.02em',
          }}
        >
          Coming soon.
        </span>
      </div>

      {/* SOON badge */}
      <span
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
          border: '1px solid var(--border-strong)',
          borderRadius: 4,
          padding: '2px 5px',
          lineHeight: 1,
        }}
      >
        SOON
      </span>
    </div>
  )
}
