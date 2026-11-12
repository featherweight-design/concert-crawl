interface PanelProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  padding?: number | string;
  children: React.ReactNode;
}

export const Panel = ({
  title,
  action,
  padding = '18px',
  children,
}: PanelProps) => (
  <div
    style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 12,
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
          // No rule under the title: no admin board draws one (survey of all
          // 291 HTML boards, #293). A line under a title on a board is the
          // first list row's own top border, which the body draws. Without
          // the rule, a padded body's own top padding is the gap, so the
          // header keeps a bottom pad only over a flush (padding 0) body.
          padding:
            padding === 0 || padding === '0' ? '14px 18px' : '14px 18px 0',
        }}
      >
        <div
          style={{
            fontSize: 14,
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
    <div style={{ padding }}>{children}</div>
  </div>
);
