import { ADMIN_COPY } from '@/components/admin/definitions/copy';

export type Kind =
  | 'show'
  | 'venue'
  | 'artist'
  | 'event'
  | 'prices'
  | 'bug'
  | 'flag'
  | 'priceCheck';

/** Accent per kind, from the Needs you boards. */
const TONE: Record<Kind, string> = {
  show: 'var(--accent)',
  venue: 'var(--warning)',
  artist: 'var(--signal)',
  event: 'var(--warning)',
  prices: 'var(--success)',
  bug: 'var(--danger)',
  flag: 'var(--fg-subtle)',
  priceCheck: 'var(--danger)',
};

/**
 * The small-caps kind label (rule 8), vertically centred on its row. `urgent`
 * turns it red, as a blocked or auto-paused venue is drawn.
 */
export const KindLabel = ({
  kind,
  urgent = false,
}: {
  kind: Kind;
  urgent?: boolean;
}) => {
  const tone = urgent ? 'var(--danger)' : TONE[kind];
  return (
    <span
      data-testid="kind-label"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'center',
        height: 18,
        padding: '0 7px',
        borderRadius: 5,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '0.12em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        color: tone,
        border: `1px solid color-mix(in srgb, ${tone} 35%, transparent)`,
      }}
    >
      {ADMIN_COPY.kind[kind]}
    </span>
  );
};
