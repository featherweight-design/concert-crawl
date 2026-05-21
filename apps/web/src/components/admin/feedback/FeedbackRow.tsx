'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/admin/primitives'
import type { FeedbackStatusFilter } from './FeedbackFilterRail'

export interface FeedbackItem {
  id: string
  userId: string
  pageUrl: string
  category: 'bug' | 'idea' | 'praise' | 'other'
  message: string
  metadata: Record<string, unknown> | null
  status: FeedbackStatusFilter
  adminNotes: string | null
  issueUrl: string | null
  createdAt: string
}

const CATEGORY_KIND = {
  bug: 'danger',
  idea: 'accent',
  praise: 'success',
  other: 'neutral',
} as const

interface FeedbackRowProps {
  item: FeedbackItem
  isExpanded: boolean
  onToggle: (id: string) => void
}

export function FeedbackRow({ item, isExpanded, onToggle }: FeedbackRowProps) {
  const isUnread = item.status === 'unread'
  const isFlagged = item.status === 'flagged'
  const hasIssue = Boolean(item.issueUrl)
  const handle = item.userId.slice(0, 8)

  let displayPath = item.pageUrl
  try {
    displayPath = new URL(item.pageUrl).pathname
  } catch {
    // pageUrl is relative or malformed; display raw
  }

  return (
    <div
      style={{
        borderBottom: '1px solid var(--border)',
        background: isUnread ? 'var(--surface-2)' : undefined,
        position: 'relative',
      }}
    >
      {isUnread && (
        <span
          style={{
            position: 'absolute',
            left: 6,
            top: 22,
            width: 6,
            height: 6,
            borderRadius: 3,
            background: 'var(--signal)',
          }}
        />
      )}
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto auto auto',
          gap: 14,
          padding: '12px 16px 12px 22px',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          alignItems: 'center',
        }}
      >
        {/* User handle */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          {handle}
        </span>

        {/* Message preview */}
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: isUnread ? 600 : 500,
            color: isUnread ? 'var(--fg)' : 'var(--fg-muted)',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 540,
          }}
        >
          {item.message}
        </span>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge kind={CATEGORY_KIND[item.category]} variant="soft">
            {item.category}
          </StatusBadge>
          {(isUnread || isFlagged) && (
            <StatusBadge kind={isFlagged ? 'warning' : 'signal'} dot>
              {item.status}
            </StatusBadge>
          )}
          {hasIssue && (
            <StatusBadge kind="accent" variant="outline">
              issue
            </StatusBadge>
          )}
        </div>

        {/* Page URL snippet */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: 'var(--fg-subtle)',
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayPath}
        </span>

        {/* Chevron */}
        {isExpanded ? (
          <ChevronDown size={14} color="var(--fg-muted)" />
        ) : (
          <ChevronRight size={14} color="var(--fg-muted)" />
        )}
      </button>
    </div>
  )
}
