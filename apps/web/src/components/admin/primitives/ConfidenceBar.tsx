import { confidenceColor, KIND_COLORS } from './utils'

interface ConfidenceBarProps {
  score: number
}

export const ConfidenceBar = ({ score }: ConfidenceBarProps) => {
  const kind = confidenceColor(score)
  const color = KIND_COLORS[kind].fg

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            width: `${score * 100}%`,
            height: '100%',
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 32,
          textAlign: 'right',
        }}
      >
        {score.toFixed(2)}
      </span>
    </div>
  )
}
