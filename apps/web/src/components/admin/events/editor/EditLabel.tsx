'use client'

import { type ReactNode } from 'react'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

export interface EditLabelProps {
  children: ReactNode
  changed?: boolean
}

export const EditLabel = ({ children, changed = false }: EditLabelProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 7,
      marginBottom: 6,
    }}
  >
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--fg-subtle)',
      }}
    >
      {children}
    </span>
    {changed && (
      <span
        title={ADMIN_COPY.editor.unsavedChangeTooltip}
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: 'var(--signal)',
          boxShadow:
            '0 0 0 3px color-mix(in oklab, var(--signal) 22%, transparent)',
        }}
      />
    )}
  </div>
)
