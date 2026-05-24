'use client'

import { ChevronDown, ChevronRight, Image } from 'lucide-react'
import { StatusBadge } from '@/components/admin/primitives'
import type { FeedbackStatusFilter } from './FeedbackFilterRail'
import type { StatusKind } from '@/components/admin/primitives/utils'

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

const CATEGORY_KIND: Record<FeedbackItem['category'], StatusKind> = {
  bug: 'danger',
  idea: 'accent',
  praise: 'success',
  other: 'neutral',
}

const STATUS_KIND: Record<string, StatusKind> = {
  unread: 'signal',
  flagged: 'warning',
  issue_opened: 'danger',
  resolved: 'success',
  read: 'neutral',
  archived: 'neutral',
}

const STATUS_LABEL: Record<string, string> = {
  unread: 'Unread',
  flagged: 'Flagged',
  issue_opened: 'Issue opened',
  resolved: 'Resolved',
  read: 'Read',
  archived: 'Archived',
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

interface FeedbackRowProps {
  item: FeedbackItem
  isExpanded: boolean
  onToggle: (id: string) => void
}

export function FeedbackRow({ item, isExpanded, onToggle }: FeedbackRowProps) {
  const isUnread = item.status === 'unread'
  const handle = `@${item.userId.slice(0, 10)}`
  const hasScreenshot = Boolean(
    item.metadata?.screenshotDataUrl ?? item.metadata?.screenshot,
  )
  const showDot = item.status === 'unread' || item.status === 'flagged'

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
            left: 8,
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
          gridTemplateColumns: '1fr auto',
          gap: 16,
          padding: '14px 16px 14px 24px',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          alignItems: 'center',
        }}
      >
        {/* Left: 2-line layout */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minWidth: 0,
          }}
        >
          {/* Line 1: username + badges */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              flexWrap: 'wrap',
            }}
          >
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
            <StatusBadge kind={CATEGORY_KIND[item.category]}>
              {item.category}
            </StatusBadge>
            <StatusBadge
              kind={STATUS_KIND[item.status] ?? 'neutral'}
              dot={showDot}
            >
              {STATUS_LABEL[item.status] ?? item.status}
            </StatusBadge>
            {hasScreenshot && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--fg-subtle)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '2px 6px',
                }}
              >
                <Image size={10} color="var(--fg-subtle)" />
                screenshot
              </span>
            )}
          </div>

          {/* Line 2: message */}
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
            }}
          >
            {item.message}
          </span>
        </div>

        {/* Right: time + chevron */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: 'var(--fg-subtle)',
              whiteSpace: 'nowrap',
            }}
          >
            {formatRelativeTime(item.createdAt)}
          </span>
          {isExpanded ? (
            <ChevronDown size={14} color="var(--fg-muted)" />
          ) : (
            <ChevronRight size={14} color="var(--fg-muted)" />
          )}
        </div>
      </button>
    </div>
  )
}
