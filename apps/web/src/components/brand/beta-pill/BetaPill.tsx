import { LANDING_COPY } from '@/app/_components/definitions/copy';

/**
 * The private-beta pill, signal-tinted as the invite landing draws it
 * (invite-320 header). Its only user is the invite landing.
 */
export function BetaPill() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 12px',
        borderRadius: 999,
        background: 'color-mix(in srgb, var(--signal) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--signal) 40%, transparent)',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--signal)',
        letterSpacing: '0.16em',
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
      {LANDING_COPY.betaPill.label}
    </span>
  );
}
