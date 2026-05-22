'use client'

import { Inbox, AlertCircle, Flag, SquarePen, Check, X } from 'lucide-react'
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

export type FeedbackSource = 'feedback_surface' | 'sentry' | 'email'

interface FeedbackFilterRailProps {
  active: FeedbackStatusFilter
  counts: StatusCounts
  onChange: (filter: FeedbackStatusFilter) => void
  activeSources?: Set<FeedbackSource>
  onSourceToggle?: (source: FeedbackSource) => void
}

const STATUS_ITEMS: {
  value: FeedbackStatusFilter
  label: string
  Icon: React.ComponentType<{ size: number; color: string }>
}[] = [
  { value: 'all', label: 'All', Icon: Inbox },
  { value: 'unread', label: 'Unread', Icon: AlertCircle },
  { value: 'flagged', label: 'Flagged', Icon: Flag },
  { value: 'issue_opened', label: 'Issue opened', Icon: SquarePen },
  { value: 'resolved', label: 'Resolved', Icon: Check },
  { value: 'archived', label: 'Archived', Icon: X },
]

const SOURCE_ITEMS: {
  value: FeedbackSource
  label: string
  soon: boolean
}[] = [
  { value: 'feedback_surface', label: 'FeedbackSurface', soon: false },
  { value: 'sentry', label: 'Sentry', soon: false },
  { value: 'email', label: 'Email', soon: true },
]

export function FeedbackFilterRail({
  active,
  counts,
  onChange,
  activeSources,
  onSourceToggle,
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
        <MonoLabel>View</MonoLabel>
      </div>

      {STATUS_ITEMS.map((item) => {
        const isActive = active === item.value
        const count = counts[item.value]
        const iconColor = isActive ? 'var(--fg)' : 'var(--fg-muted)'
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              background: isActive ? 'var(--surface-2)' : 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: isActive ? 700 : 500,
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
            <item.Icon size={14} color={iconColor} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {count > 0 && (
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 8,
                  background: isActive ? 'var(--bg)' : 'var(--surface-1)',
                  color: 'var(--fg-muted)',
                  fontVariantNumeric: 'tabular-nums',
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

      {SOURCE_ITEMS.map((src) => {
        const isChecked = activeSources
          ? activeSources.has(src.value)
          : src.value === 'feedback_surface'
        return (
          <label
            key={src.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 8,
              cursor: src.soon ? 'default' : 'pointer',
              opacity: src.soon ? 0.55 : 1,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--fg-muted)',
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              disabled={src.soon}
              onChange={() => {
                if (!src.soon && onSourceToggle) {
                  onSourceToggle(src.value)
                }
              }}
              style={{
                accentColor: 'var(--signal)',
                width: 14,
                height: 14,
                cursor: src.soon ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1 }}>{src.label}</span>
            {src.soon && (
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--fg-subtle)',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 20,
                  padding: '1px 7px',
                }}
              >
                soon
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}
