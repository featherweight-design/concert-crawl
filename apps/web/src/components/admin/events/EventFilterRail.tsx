'use client'

type StatusFilter = 'low_conf' | 'unverified' | 'verified'

const FILTERS: Array<{
  id: StatusFilter
  label: string
  kind: 'warning' | 'signal' | 'neutral'
}> = [
  { id: 'low_conf', label: 'Low conf.', kind: 'warning' },
  { id: 'unverified', label: 'Unverified', kind: 'signal' },
  { id: 'verified', label: 'Verified', kind: 'neutral' },
]

interface Props {
  activeFilter: StatusFilter | null
  onFilterChange: (filter: StatusFilter | null) => void
}

export function EventFilterRail({ activeFilter, onFilterChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}
    >
      <button
        onClick={() => onFilterChange(null)}
        style={{
          height: 28,
          padding: '0 12px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 500,
          border:
            activeFilter === null
              ? '2px solid var(--signal)'
              : '1px solid var(--border)',
          background:
            activeFilter === null ? 'rgba(29,95,191,0.08)' : 'transparent',
          color: activeFilter === null ? 'var(--signal)' : 'var(--fg-muted)',
          cursor: 'pointer',
        }}
      >
        All
      </button>
      {FILTERS.map((filterItem) => (
        <button
          key={filterItem.id}
          onClick={() =>
            onFilterChange(
              activeFilter === filterItem.id ? null : filterItem.id,
            )
          }
          style={{
            height: 28,
            padding: '0 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            border:
              activeFilter === filterItem.id
                ? `2px solid var(--${filterItem.kind})`
                : '1px solid var(--border)',
            background:
              activeFilter === filterItem.id
                ? 'rgba(29,95,191,0.06)'
                : 'transparent',
            color:
              activeFilter === filterItem.id
                ? `var(--${filterItem.kind})`
                : 'var(--fg-muted)',
            cursor: 'pointer',
          }}
        >
          {filterItem.label}
        </button>
      ))}
    </div>
  )
}
