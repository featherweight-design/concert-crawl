'use client'

import { useState } from 'react'
import type { CrawlRun } from '@concert-crawl/types'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

type FilterTab = 'all' | 'crawl' | 'events' | 'invites'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: ADMIN_COPY.dashboard.activityFeed.tabs.all },
  { id: 'crawl', label: ADMIN_COPY.dashboard.activityFeed.tabs.crawl },
  { id: 'events', label: ADMIN_COPY.dashboard.activityFeed.tabs.events },
  { id: 'invites', label: ADMIN_COPY.dashboard.activityFeed.tabs.invites },
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
      {tab === 'events' || tab === 'invites' ? (
        <div
          style={{
            padding: '24px 0',
            textAlign: 'center',
            color: 'var(--fg-subtle)',
            fontSize: 13,
          }}
        >
          {ADMIN_COPY.dashboard.activityFeed.noRecentActivity}
        </div>
      ) : (
        <>
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
                    ? ADMIN_COPY.dashboard.activityFeed.crawlOk(
                        run.venueName ??
                          ADMIN_COPY.dashboard.activityFeed.venueFallback,
                      )
                    : ADMIN_COPY.dashboard.activityFeed.crawlStatus(
                        run.venueName ??
                          ADMIN_COPY.dashboard.activityFeed.venueFallback,
                        run.status,
                      )}
                </div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                  {run.eventsFound} events · {run.extractionStrategyUsed ?? '—'}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div
              style={{
                color: 'var(--fg-subtle)',
                fontSize: 13,
                padding: '12px 0',
              }}
            >
              {ADMIN_COPY.dashboard.activityFeed.noActivity}
            </div>
          )}
        </>
      )}
    </div>
  )
}
