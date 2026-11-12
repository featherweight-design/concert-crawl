interface StatPillProps {
  label: string;
  value: string;
  signal?: boolean;
}

/** A single word longer than this can't fit a third of a 390px column at 22px. */
const LONG_WORD = 8;

function hasLongWord(value: string): boolean {
  return value.split(/\s+/).some((word) => word.length > LONG_WORD);
}

export function StatPill({ label, value, signal = false }: StatPillProps) {
  const longWord = hasLongWord(value);
  return (
    // The wrapper is a size container so a long word can scale to its column
    // (`cqw`) rather than break mid-word ("Amphithe/ater").
    <div
      className="flex min-w-0 flex-col gap-1.5"
      style={{ containerType: 'inline-size' }}
    >
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
      {/* A value with spaces wraps at them at full size. A single long word
          (a venue type) steps down to fit its column and never breaks
          mid-word. */}
      <span
        data-testid="stat-value"
        data-long-word={longWord ? 'true' : undefined}
        className="font-bold"
        style={{
          overflowWrap: 'normal',
          fontSize: longWord ? 'min(22px, 12.5cqw)' : '22px',
          lineHeight: 1.05,
          color: signal ? 'var(--signal)' : 'var(--fg)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
    </div>
  );
}
