interface SourcePillProps {
  sourceKind: 'resale' | 'community' | 'primary' | null
}

export function SourcePill({ sourceKind }: SourcePillProps) {
  if (!sourceKind || sourceKind === 'primary') return null

  const isResale = sourceKind === 'resale'
  const color = isResale ? 'var(--warning)' : 'var(--signal)'

  const tooltip = isResale
    ? 'Resale price — secondary market, not face value'
    : 'Community price — submitted by a fan'

  return (
    <span
      title={tooltip}
      style={{
        display: 'inline-block',
        fontFamily: 'var(--font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: '1px 4px',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {isResale ? 'RESALE' : 'COMMUNITY'}
    </span>
  )
}
