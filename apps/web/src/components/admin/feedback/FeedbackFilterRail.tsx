'use client'

import { MonoLabel } from '@/components/admin/primitives'

export type FeedbackStatusFilter =
  | 'all'
  | 'unread'
  | 'read'
  | 'flagged'
  | 'issue_opened'
  | 'resolved'
  | 'archived'

interface StatusCounts {
  all: number
  unread: number
  read: number
  flagged: number
  issue_opened: number
  resolved: number
  archived: number
}

interface FeedbackFilterRailProps {
  active: FeedbackStatusFilter
  counts: StatusCounts
  onChange: (filter: FeedbackStatusFilter) => void
}

const STATUS_ITEMS: { value: FeedbackStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'issue_opened', label: 'Issue opened' },
  { value: 'read', label: 'Read' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
]

export function FeedbackFilterRail({
  active,
  counts,
  onChange,
}: FeedbackFilterRailProps) {
  return (
    <div
      style={{
        width: 200,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignSelf: 'flex-start',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '8px 10px' }}>
        <MonoLabel>Status</MonoLabel>
      </div>

      {STATUS_ITEMS.map((item) => {
        const isActive = active === item.value
        const count = counts[item.value]
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              background: isActive ? 'var(--surface-2)' : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
              fontFamily: "'Inter', sans-serif",
              position: 'relative',
              textAlign: 'left',
            }}
          >
            {isActive && (
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: 'var(--signal)',
                  borderRadius: 2,
                }}
              />
            )}
            <span style={{ paddingLeft: isActive ? 6 : 0 }}>{item.label}</span>
            {count > 0 && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 8,
                  background: isActive
                    ? 'var(--bg-elevated)'
                    : 'var(--surface-1)',
                  color: isActive ? 'var(--signal)' : 'var(--fg-subtle)',
                  flexShrink: 0,
                }}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}

      <div
        style={{
          height: 1,
          background: 'var(--border)',
          margin: '6px 8px',
        }}
      />

      <div style={{ padding: '4px 10px 8px' }}>
        <MonoLabel>Source</MonoLabel>
      </div>
    </div>
  )
}
