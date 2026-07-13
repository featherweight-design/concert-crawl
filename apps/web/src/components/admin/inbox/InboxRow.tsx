'use client'

import Link from 'next/link'
import * as LucideIcons from 'lucide-react'
import { Check, ChevronRight } from 'lucide-react'
import type { InboxItem } from '@concert-crawl/types'
import { RelTime } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import type { AttentionSeverity } from '@/components/admin/dashboard/AttentionFeed'
import { CATEGORY_META } from './lib/category-meta'

const COPY = ADMIN_COPY.adminInbox

// Severity tints, matching AttentionFeed's palette so the inbox reads as the
// same surface family.
const SEV_TINT: Record<
  AttentionSeverity,
  { fg: string; bg: string; border: string }
> = {
  danger: {
    fg: 'var(--danger)',
    bg: 'color-mix(in oklab, var(--danger) 14%, transparent)',
    border: 'color-mix(in oklab, var(--danger) 32%, transparent)',
  },
  warning: {
    fg: 'var(--warning)',
    bg: 'color-mix(in oklab, var(--warning) 16%, transparent)',
    border: 'color-mix(in oklab, var(--warning) 36%, transparent)',
  },
  signal: {
    fg: 'var(--signal)',
    bg: 'color-mix(in oklab, var(--signal) 12%, transparent)',
    border: 'color-mix(in oklab, var(--signal) 28%, transparent)',
  },
  neutral: {
    fg: 'var(--fg-muted)',
    bg: 'var(--surface-1)',
    border: 'var(--border)',
  },
}

const RowIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ size: number }>
    >
  )[name]
  return Icon ? <Icon size={size} /> : null
}

interface InboxRowProps {
  item: InboxItem
  onMarkRead: (item: InboxItem) => void
  marking: boolean
}

export const InboxRow = ({ item, onMarkRead, marking }: InboxRowProps) => {
  const meta = CATEGORY_META[item.itemType]
  const tint = SEV_TINT[meta.severity]
  const isRead = item.readAt !== null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        gap: 12,
        alignItems: 'flex-start',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        // Read rows recede; unread rows carry a faint accent wash on the left.
        background: isRead
          ? 'transparent'
          : 'color-mix(in oklab, var(--signal) 4%, transparent)',
        opacity: isRead ? 0.72 : 1,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tint.bg,
          color: tint.fg,
          flexShrink: 0,
          border: `1px solid ${tint.border}`,
        }}
      >
        <RowIcon name={meta.iconName} size={14} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 13,
              fontWeight: isRead ? 500 : 600,
              color: 'var(--fg)',
              letterSpacing: '-0.005em',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.title}
          </span>
          {!isRead && (
            <span
              aria-label={COPY.unreadIndicator}
              style={{
                width: 7,
                height: 7,
                borderRadius: 99,
                background: 'var(--signal)',
                flexShrink: 0,
              }}
            />
          )}
        </div>

        <div
          style={{
            fontFamily: 'var(--admin-font, Inter, sans-serif)',
            fontSize: 12,
            color: 'var(--fg-muted)',
            marginTop: 3,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.body}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 6,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--fg-subtle)',
            }}
          >
            <RelTime iso={item.sourceCreatedAt} />
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: isRead ? 'var(--fg-subtle)' : 'var(--signal)',
            }}
          >
            {isRead ? COPY.readIndicator : COPY.unreadIndicator}
          </span>
          <Link
            href={item.actionUrl}
            aria-label={COPY.openAria(item.title)}
            style={{
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--signal)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              textDecoration: 'none',
            }}
          >
            {COPY.open}
            <ChevronRight size={11} />
          </Link>
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {!isRead && (
          <button
            type="button"
            onClick={() => onMarkRead(item)}
            disabled={marking}
            aria-label={COPY.markReadAria(item.title)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              height: 28,
              padding: '0 10px',
              borderRadius: 8,
              cursor: marking ? 'default' : 'pointer',
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--fg-muted)',
              background: 'transparent',
              border: '1px solid var(--border-strong)',
              opacity: marking ? 0.6 : 1,
            }}
          >
            <Check size={12} />
            {COPY.markRead}
          </button>
        )}
      </div>
    </div>
  )
}
