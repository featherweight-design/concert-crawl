import type { StatusKind } from './utils'

interface ProgressBarProps {
  value: number
  kind?: StatusKind
  showLabel?: boolean
}

const KIND_STROKE: Record<StatusKind, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  signal: 'var(--signal)',
  accent: 'var(--accent)',
  neutral: 'var(--fg-subtle)',
}

export const ProgressBar = ({
  value,
  kind = 'signal',
  showLabel = false,
}: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 999,
          background: 'var(--surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: KIND_STROKE[kind],
            borderRadius: 999,
            transition: 'width .25s ease',
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--fg-muted)',
            fontVariantNumeric: 'tabular-nums',
            minWidth: 32,
          }}
        >
          {clamped}%
        </span>
      )}
    </div>
  )
}
