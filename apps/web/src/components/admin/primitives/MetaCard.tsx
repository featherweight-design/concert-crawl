import { MonoLabel } from './MonoLabel'

interface MetaCardProps {
  title: string
  action?: React.ReactNode
  danger?: boolean
  padding?: number
  children: React.ReactNode
}

export const MetaCard = ({
  title,
  action,
  danger = false,
  padding = 14,
  children,
}: MetaCardProps) => (
  <div
    style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${danger ? 'color-mix(in oklab, var(--danger) 32%, var(--border))' : 'var(--border)'}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: danger
          ? 'color-mix(in oklab, var(--danger) 8%, transparent)'
          : 'var(--surface-1)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <MonoLabel color={danger ? 'var(--danger)' : undefined}>{title}</MonoLabel>
      {action}
    </div>
    <div style={{ padding }}>{children}</div>
  </div>
)
