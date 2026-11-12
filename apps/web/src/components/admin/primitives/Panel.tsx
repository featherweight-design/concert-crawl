interface PanelProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  padding?: number | string;
  /**
   * The phone boards' compact panel (03/health-mobile, 04/venue-mobile): a
   * 14px title and 14px padding with a 10px gap under the title, at 720px and
   * below (`.admin-panel-phone-compact` in admin.css). Other phone boards
   * draw the standard panel, so it is opt-in.
   */
  phoneCompact?: boolean;
  children: React.ReactNode;
}

const cssLength = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value;

// Measured from the admin boards (survey on #293): every titled panel is
// radius 14 with a 15px, 700 title, and none draws a rule under the title. A
// line under a title on a board is the first list row's own top border,
// which the body draws.
export const Panel = ({
  title,
  action,
  padding = '18px',
  phoneCompact = false,
  children,
}: PanelProps) => {
  const flush = padding === 0 || padding === '0';
  // Without the rule, a padded body's own top padding is the gap under the
  // title, so the header keeps a bottom pad only over a flush body.
  const headPad = flush ? '14px 18px' : '16px 18px 0';
  const compact = phoneCompact && !flush;
  return (
    <div
      className={phoneCompact ? 'admin-panel-phone-compact' : undefined}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: compact ? `var(--panel-head-pad, ${headPad})` : headPad,
          }}
        >
          <div
            style={{
              fontSize: phoneCompact ? 'var(--panel-title-size, 15px)' : 15,
              fontWeight: 700,
              color: 'var(--fg)',
              letterSpacing: '-0.01em',
              minWidth: 0,
            }}
          >
            {title}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      )}
      <div
        style={{
          padding: compact
            ? `var(--panel-body-pad, ${cssLength(padding)})`
            : padding,
        }}
      >
        {children}
      </div>
    </div>
  );
};
