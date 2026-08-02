import React from 'react'

interface SectionHeadProps {
  /** Anchor target — the player's skip link points at this. */
  id?: string
  title: string
  /** Rendered only when non-null; the unit is always SHOWS, never items. */
  count?: string | null
}

/** A real `<h2>` plus a rule. Section structure is announced, not implied. */
export const SectionHead = ({ id, title, count }: SectionHeadProps) => (
  <div
    id={id}
    style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}
  >
    <h2
      style={{
        margin: 0,
        fontFamily: 'Inter, system-ui',
        fontWeight: 800,
        fontSize: 15,
        letterSpacing: '-0.01em',
        color: 'var(--fg)',
        whiteSpace: 'nowrap',
      }}
    >
      {title}
    </h2>
    <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    {count ? (
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
        {count}
      </span>
    ) : null}
  </div>
)
