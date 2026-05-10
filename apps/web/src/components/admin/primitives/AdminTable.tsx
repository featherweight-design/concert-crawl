'use client'

import { cn } from '@/lib/utils'

export const AdminTable = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => (
  <div style={{ overflowX: 'auto' }}>
    <table
      className={cn(className)}
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 13,
        color: 'var(--fg)',
      }}
    >
      {children}
    </table>
  </div>
)

export const THead = ({ children }: { children: React.ReactNode }) => (
  <thead style={{ background: 'var(--surface-1)' }}>{children}</thead>
)

export const TR = ({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
}) => (
  <tr
    onClick={onClick}
    {...(onClick
      ? {
          onKeyDown: (evt: React.KeyboardEvent<HTMLTableRowElement>) => {
            if (evt.key === 'Enter' || evt.key === ' ') {
              evt.preventDefault()
              onClick()
            }
          },
          tabIndex: 0,
          role: 'button',
        }
      : {})}
    style={{
      borderBottom: '1px solid var(--border)',
      background: active ? 'var(--surface-2)' : undefined,
      borderLeft: active ? '2px solid var(--signal)' : '2px solid transparent',
      cursor: onClick ? 'pointer' : undefined,
    }}
    onMouseEnter={(ev) => {
      if (!active)
        (ev.currentTarget as HTMLElement).style.background =
          'var(--overlay-hover)'
    }}
    onMouseLeave={(ev) => {
      if (!active) (ev.currentTarget as HTMLElement).style.background = ''
    }}
  >
    {children}
  </tr>
)

interface THProps {
  children?: React.ReactNode
  align?: 'left' | 'center' | 'right'
  mono?: boolean
  width?: number | string
}

export const TH = ({ children, align = 'left', mono, width }: THProps) => (
  <th
    style={{
      padding: '10px 14px',
      textAlign: align,
      fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--fg-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
      width,
    }}
  >
    {children}
  </th>
)

interface TDProps {
  children?: React.ReactNode
  align?: 'left' | 'center' | 'right'
  mono?: boolean
  color?: string
  width?: number | string
  colSpan?: number
}

export const TD = ({
  children,
  align = 'left',
  mono,
  color,
  width,
  colSpan,
}: TDProps) => (
  <td
    colSpan={colSpan}
    style={{
      padding: '12px 14px',
      textAlign: align,
      fontFamily: mono ? "'JetBrains Mono', monospace" : "'Inter', sans-serif",
      fontVariantNumeric: mono ? 'tabular-nums' : undefined,
      color: color ?? 'var(--fg)',
      width,
    }}
  >
    {children}
  </td>
)
