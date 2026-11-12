import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COUNT = {
  fontSize: 12.5,
  color: 'var(--fg-muted)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
} as const;

/**
 * Seats used as a bar and "23 of 50"; grey once Full (`07/invite-codes`).
 * With no cap to show (`max` null, a member's share code) it is the count
 * alone, "4 joined", as the share sheet draws a code that doesn't run out: a
 * bar against a ceiling nobody set would only ever read empty.
 */
export const SeatsBar = ({
  used,
  max,
  full,
  width = 110,
}: {
  used: number;
  max: number | null;
  full: boolean;
  width?: number;
}) => {
  if (max === null) {
    return (
      <span data-testid="seats-joined" style={COUNT}>
        {ADMIN_COPY.codesPage.seatsJoined(used)}
      </span>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <div
        aria-hidden
        style={{
          width,
          minWidth: 40,
          height: 6,
          borderRadius: 3,
          background: 'var(--border)',
          overflow: 'hidden',
          // Shrinks before a 320px card overflows; drawn width otherwise.
          flex: '0 1 auto',
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.round((used / Math.max(1, max)) * 100))}%`,
            height: '100%',
            background: full ? 'var(--fg-subtle)' : 'var(--signal)',
          }}
        />
      </div>
      <span style={COUNT}>{ADMIN_COPY.codesPage.seatsUsed(used, max)}</span>
    </div>
  );
};
