interface PanelProps {
  title?: React.ReactNode
  action?: React.ReactNode
  padding?: number | string
  children: React.ReactNode
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
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
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
)
