interface PanelProps {
  title?: React.ReactNode
  action?: React.ReactNode
  padding?: number | string
  children: React.ReactNode
}

export const Panel = ({
  title,
  action,
  padding = '16px',
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
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>
          {title}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div style={{ padding }}>{children}</div>
  </div>
)
