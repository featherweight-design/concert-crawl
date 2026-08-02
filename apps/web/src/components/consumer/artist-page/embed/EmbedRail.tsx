import React from 'react'

interface EmbedRailProps {
  label: string
  /** Right-hand disclosure. Omitted in the absent-player state. */
  note?: string | undefined
}

/**
 * The rail above the player. It exists to say, before anything renders, that
 * what follows is somebody else's surface — the honesty rail in one line.
 */
export const EmbedRail = ({ label, note }: EmbedRailProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      marginBottom: 8,
    }}
  >
    <span
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
      }}
    >
      {label}
    </span>
    <span
      aria-hidden="true"
      style={{ flex: 1, height: 1, background: 'var(--border)' }}
    />
    {note ? (
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
        }}
      >
        {note}
      </span>
    ) : null}
  </div>
)
