'use client'

import { type ReactNode } from 'react'
import { EditLabel } from './EditLabel'

export type EditFieldType =
  | 'text'
  | 'number'
  | 'time'
  | 'select'
  | 'textarea'
  | 'tags'
  | 'readonly'
  | 'mono'

export interface EditFieldProps {
  label: string
  type?: EditFieldType | undefined
  /** String value for text/number/time/select/textarea; ReactNode for readonly. */
  value?: string | ReactNode | undefined
  placeholder?: string | undefined
  prefix?: string | undefined
  changed?: boolean | undefined
  error?: string | undefined
  help?: string | undefined
  /** Tag list for type='tags'. */
  tags?: string[] | undefined
  /** When true, spans the full grid row. */
  full?: boolean | undefined
}

const boxStyle = (error: boolean, surface1: boolean): React.CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  background: surface1 ? 'var(--surface-1)' : 'var(--bg-elevated)',
  border: `1.5px solid ${error ? 'var(--danger)' : 'var(--border-strong)'}`,
  borderRadius: 9,
  padding: '10px 12px',
  fontFamily: "'Inter', sans-serif",
  fontSize: 13.5,
  fontWeight: 500,
  color: surface1 ? 'var(--fg-muted)' : 'var(--fg)',
})

export const EditField = ({
  label,
  type = 'text',
  value,
  placeholder,
  prefix,
  changed = false,
  error,
  help,
  tags,
  full = false,
}: EditFieldProps) => {
  let control: ReactNode
  const hasError = Boolean(error)

  if (type === 'readonly' || type === 'mono') {
    control = (
      <div
        style={{
          ...boxStyle(hasError, true),
          fontFamily:
            type === 'mono'
              ? "'JetBrains Mono', monospace"
              : "'Inter', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {value ?? '—'}
      </div>
    )
  } else if (type === 'textarea') {
    control = (
      <div
        style={{
          ...boxStyle(hasError, false),
          minHeight: 64,
          color: value ? 'var(--fg)' : 'var(--fg-subtle)',
          lineHeight: 1.5,
        }}
      >
        {value || placeholder || '—'}
      </div>
    )
  } else if (type === 'tags') {
    control = (
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {(tags ?? []).length === 0 ? (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'var(--fg-subtle)',
            }}
          >
            —
          </span>
        ) : (
          (tags ?? []).map((tag) => (
            <span
              key={tag}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 7,
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--fg)',
              }}
            >
              {tag}
            </span>
          ))
        )}
      </div>
    )
  } else if (type === 'select') {
    control = (
      <div
        style={{
          ...boxStyle(hasError, false),
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{ flex: 1, color: value ? 'var(--fg)' : 'var(--fg-subtle)' }}
        >
          {value || placeholder || '—'}
        </span>
      </div>
    )
  } else {
    // text / number / time
    const monoLike = type === 'number' || type === 'time'
    control = (
      <div
        style={{
          ...boxStyle(hasError, false),
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: monoLike
            ? "'JetBrains Mono', monospace"
            : "'Inter', sans-serif",
        }}
      >
        {prefix !== undefined && (
          <span
            style={{
              color: 'var(--fg-subtle)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {prefix}
          </span>
        )}
        <span
          style={{
            flex: 1,
            color: value ? 'var(--fg)' : 'var(--fg-subtle)',
            fontWeight: monoLike ? 600 : 500,
          }}
        >
          {value || placeholder || '—'}
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        gridColumn: full ? '1 / -1' : 'auto',
        minWidth: 0,
      }}
    >
      <EditLabel changed={changed}>{label}</EditLabel>
      {control}
      {hasError && (
        <div
          style={{
            marginTop: 6,
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--danger)',
          }}
        >
          {error}
        </div>
      )}
      {help && !hasError && (
        <div
          style={{
            marginTop: 6,
            fontFamily: "'Inter', sans-serif",
            fontSize: 11.5,
            color: 'var(--fg-subtle)',
            lineHeight: 1.5,
          }}
        >
          {help}
        </div>
      )}
    </div>
  )
}
