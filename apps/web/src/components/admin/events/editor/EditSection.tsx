'use client'

import { type ReactNode } from 'react'

export interface EditSectionProps {
  number: string
  title: string
  action?: ReactNode
  children: ReactNode
}

export const EditSection = ({
  number,
  title,
  action,
  children,
}: EditSectionProps) => (
  <div
    style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 13,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--fg-subtle)',
          }}
        >
          {number}
        </span>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--fg)',
          }}
        >
          {title}
        </span>
      </div>
      {action && <div>{action}</div>}
    </div>
    <div style={{ padding: 18 }}>{children}</div>
  </div>
)
