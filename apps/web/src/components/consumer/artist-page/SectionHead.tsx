import React from 'react';

interface SectionHeadProps {
  /** Anchor target — the player's skip link points at this. */
  id?: string;
  title: string;
  /** Rendered only when non-null; the unit is always SHOWS, never items. */
  count?: string | null;
}

/**
 * A real `<h2>`, its count, then a rule (B+ `09-artist`). The count sits
 * beside the title and the rule takes the slack, so at 320px the rule shrinks
 * and the count never clips. Section structure is announced, not implied.
 */
export const SectionHead = ({ id, title, count }: SectionHeadProps) => (
  <div
    id={id}
    style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 12,
      marginBottom: 14,
    }}
  >
    <h2
      style={{
        margin: 0,
        fontFamily: 'Inter, system-ui',
        fontWeight: 800,
        fontSize: 19,
        letterSpacing: '-0.02em',
        color: 'var(--fg)',
        whiteSpace: 'nowrap',
      }}
    >
      {title}
    </h2>
    {count ? (
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--fg-subtle)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {count}
      </span>
    ) : null}
    <div
      aria-hidden="true"
      style={{
        flex: 1,
        height: 1,
        background: 'var(--border)',
        alignSelf: 'center',
      }}
    />
  </div>
);
