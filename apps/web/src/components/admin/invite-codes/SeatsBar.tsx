import { ADMIN_COPY } from '@/components/admin/definitions/copy';

/** Seats used as a bar and "23 of 50"; grey once Full (`07/invite-codes`). */
export const SeatsBar = ({
  used,
  max,
  full,
  width = 110,
}: {
  used: number;
  max: number;
  full: boolean;
  width?: number;
}) => (
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
    <span
      style={{
        fontSize: 12.5,
        color: 'var(--fg-muted)',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {ADMIN_COPY.codesPage.seatsUsed(used, max)}
    </span>
  </div>
);
