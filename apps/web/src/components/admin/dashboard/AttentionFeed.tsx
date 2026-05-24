'use client'

import Link from 'next/link'
import * as LucideIcons from 'lucide-react'
import { ChevronRight, CheckCircle } from 'lucide-react'
import { Panel } from '@/components/admin/primitives'

export type AttentionSeverity = 'danger' | 'warning' | 'signal' | 'neutral'

export interface AttentionItemData {
  id: string
  severity: AttentionSeverity
  iconName: string
  title: string
  meta: string
  timeLabel: string
  action?: { label: string; href: string }
}

interface AttentionFeedProps {
  items: AttentionItemData[]
  digestLabel?: string
  digestHref?: string
}

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

const ItemIcon = ({ name, size }: { name: string; size: number }) => {
  const Icon = (
    LucideIcons as unknown as Record<
      string,
      React.ComponentType<{ size: number }>
    >
  )[name]
  return Icon ? <Icon size={size} /> : null
}

const AttentionItemRow = ({ item }: { item: AttentionItemData }) => {
  const tint = SEV_TINT[item.severity]
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr auto',
        gap: 12,
        alignItems: 'flex-start',
        padding: '14px 18px',
        borderBottom: '1px solid var(--border)',
        transition: 'background .12s',
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
        <ItemIcon name={item.iconName} size={14} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--admin-font, Inter, sans-serif)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--fg)',
            letterSpacing: '-0.005em',
            lineHeight: 1.4,
          }}
        >
          {item.title}
        </div>
        <div
          style={{
            fontFamily: 'var(--admin-font, Inter, sans-serif)',
            fontSize: 12,
            color: 'var(--fg-muted)',
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {item.meta}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 6,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: 'var(--fg-subtle)',
            }}
          >
            {item.timeLabel}
          </span>
          {item.action && (
            <Link
              href={item.action.href}
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
              {item.action.label}
              <ChevronRight size={11} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export const AttentionFeed = ({
  items,
  digestLabel,
  digestHref,
}: AttentionFeedProps) => {
  const activeItems = items.filter((item) => item.severity !== 'neutral')
  const neutralItems = items.filter((item) => item.severity === 'neutral')
  const allItems = [...activeItems, ...neutralItems]

  const activeCount = activeItems.length

  const panelTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>Needs your attention</span>
      {activeCount > 0 && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: 99,
            background: 'color-mix(in oklab, var(--accent) 16%, transparent)',
            border:
              '1px solid color-mix(in oklab, var(--accent) 32%, transparent)',
            fontFamily: 'var(--admin-font, Inter, sans-serif)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent)',
            letterSpacing: '0.01em',
          }}
        >
          {activeCount} active
        </span>
      )}
    </div>
  )

  return (
    <Panel title={panelTitle} padding={0}>
      {allItems.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '20px 18px',
            color: 'var(--fg-subtle)',
          }}
        >
          <CheckCircle size={16} color="var(--success)" />
          <span
            style={{
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 13,
            }}
          >
            No items need attention right now.
          </span>
        </div>
      ) : (
        <>
          {allItems.map((item) => (
            <AttentionItemRow key={item.id} item={item} />
          ))}
        </>
      )}

      {digestLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            background: 'var(--surface-1)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              background:
                'color-mix(in oklab, var(--success) 14%, transparent)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle size={12} />
          </div>
          <span
            style={{
              fontFamily: 'var(--admin-font, Inter, sans-serif)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--fg)',
              flex: 1,
            }}
          >
            {digestLabel}
          </span>
          {digestHref && (
            <Link
              href={digestHref}
              style={{
                fontFamily: 'var(--admin-font, Inter, sans-serif)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--signal)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              View crawl log
              <ChevronRight size={11} />
            </Link>
          )}
        </div>
      )}
    </Panel>
  )
}
