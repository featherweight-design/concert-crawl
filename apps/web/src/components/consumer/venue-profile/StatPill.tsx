interface StatPillProps {
  label: string;
  value: string;
  signal?: boolean;
}

export function StatPill({ label, value, signal = false }: StatPillProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span
        className="text-fg-subtle"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      {/* Design addendum 2 (#178) item 17: a value that doesn't fit its
          column wraps to a second line. It never shrinks or truncates; a
          single long word (a venue type) breaks rather than overflowing. */}
      <span
        data-testid="stat-value"
        className="font-bold"
        style={{
          overflowWrap: 'break-word',
          fontSize: '22px',
          lineHeight: 1,
          color: signal ? 'var(--signal)' : 'var(--fg)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
    </div>
  );
}
