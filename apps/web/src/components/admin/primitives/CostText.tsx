import { formatCost } from './utils'

interface CostTextProps {
  value: number
  dim?: boolean
}

export const CostText = ({ value, dim }: CostTextProps) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontVariantNumeric: 'tabular-nums',
      color: value === 0 || dim ? 'var(--fg-subtle)' : 'var(--fg)',
    }}
  >
    {formatCost(value)}
  </span>
)
