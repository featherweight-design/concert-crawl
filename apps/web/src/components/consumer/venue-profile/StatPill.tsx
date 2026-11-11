interface StatPillProps {
  label: string;
  value: string;
  signal?: boolean;
}

export function StatPill({ label, value, signal = false }: StatPillProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
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
      {/* A free-text value (venue type) can be one long word; at 320 each
          pill is ~84px, so it truncates rather than overflowing the row. */}
      <span
        className="truncate font-bold"
        style={{
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
