'use client'

import { useState } from 'react'
import type { CrawlRun } from '@concert-crawl/types'

type FilterTab = 'all' | 'crawl'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'crawl', label: 'Crawl' },
]

interface Props {
  runs: CrawlRun[]
}

export function ActivityFeed({ runs }: Props) {
  const [tab, setTab] = useState<FilterTab>('all')

  // Currently both tabs show the same runs (crawl is the only activity type);
  // when new activity types are added, filter by tab here.
  const filtered = tab === 'all' ? runs : runs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 12 }}>
        {TABS.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            style={{
              height: 26,
              padding: '0 10px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background:
                tab === tabItem.id ? 'var(--surface-2)' : 'transparent',
              color: tab === tabItem.id ? 'var(--fg)' : 'var(--fg-muted)',
            }}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* Activity items */}
      {filtered.slice(0, 8).map((run) => (
        <div
          key={run.id}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            paddingBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: 'var(--fg-subtle)',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 56,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {new Date(run.startedAt ?? run.createdAt).toLocaleTimeString(
              'en-US',
              {
                hour: '2-digit',
                minute: '2-digit',
              },
            )}
          </span>
          <div style={{ flex: 1, fontSize: 13 }}>
            <div style={{ color: 'var(--fg)', fontWeight: 500 }}>
              {run.status === 'success'
                ? `${run.venueName ?? 'Venue'} crawl ok`
                : `${run.venueName ?? 'Venue'} crawl ${run.status}`}
            </div>
            <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
              {run.eventsFound} events · {run.extractionStrategyUsed ?? '—'}
            </div>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div
          style={{ color: 'var(--fg-subtle)', fontSize: 13, padding: '12px 0' }}
        >
          No activity yet.
        </div>
      )}
    </div>
  )
}
