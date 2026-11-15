const bar = (width: number | string, height: number, radius = 6) => (
  <div
    className="admin-skeleton"
    style={{ width, height, borderRadius: radius, flex: 'none' }}
  />
);

/** Each row's title width, from `07/loading-feedback`. */
const TITLE_WIDTHS = ['38%', '55%', '42%', '59%'];

/**
 * `07/loading-feedback` under Operations' shell: the search and chip pills,
 * then a card of rows (a title, a meta line and a right-side pill). Pass
 * `chips={false}` when the real chips are already drawn above it.
 */
export const FeedbackSkeleton = ({ chips = true }: { chips?: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {chips && (
      <div style={{ display: 'flex', gap: 8, overflow: 'hidden' }}>
        {bar(260, 36, 10)}
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx}>{bar(92, 32, 999)}</div>
        ))}
      </div>
    )}
    <div
      data-testid="feedback-skeleton"
      style={{
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--surface-1)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 18px' }}>{bar('40%', 9)}</div>
      {TITLE_WIDTHS.map((width, idx) => (
        <div
          key={width}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '13px 18px',
            borderTop: '1px solid var(--border)',
            opacity: 1 - idx * 0.12,
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 7,
            }}
          >
            {bar(width, 13)}
            {bar('22%', 9)}
          </div>
          {bar(70, 20, 999)}
        </div>
      ))}
    </div>
  </div>
);
