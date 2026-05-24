'use client'

import { useRouter } from 'next/navigation'
import {
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
  RelTime,
  CostText,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'
import { formatStrategy } from './lib/dashboard'
import type { CrawlStatusRow } from './lib/dashboard'
import { COPY } from './definitions/copy'

const STATUS_KIND: Record<string, StatusKind> = {
  success: 'success',
  failed: 'danger',
  blocked: 'danger',
  partial: 'warning',
  paused: 'warning',
  never: 'neutral',
}

export function CrawlHealthTable({ rows }: { rows: CrawlStatusRow[] }) {
  const router = useRouter()

  return (
    <AdminTable>
      <THead>
        <tr>
          <TH>{COPY.crawlHealthTable.columns.venue}</TH>
          <TH>{COPY.crawlHealthTable.columns.status}</TH>
          <TH>{COPY.crawlHealthTable.columns.lastCrawl}</TH>
          <TH>{COPY.crawlHealthTable.columns.strategy}</TH>
          <TH align="right" mono>
            {COPY.crawlHealthTable.columns.events}
          </TH>
          <TH align="right" mono>
            {COPY.crawlHealthTable.columns.cost}
          </TH>
        </tr>
      </THead>
      <tbody>
        {rows.map((row) => (
          <TR
            key={row.venueId}
            onClick={() => router.push(`/admin/crawl?venueId=${row.venueId}`)}
          >
            <TD>{row.venueName}</TD>
            <TD>
              <StatusBadge kind={STATUS_KIND[row.status] ?? 'neutral'} dot>
                {row.status}
              </StatusBadge>
            </TD>
            <TD color="var(--fg-muted)">
              {row.lastRunAt ? <RelTime iso={row.lastRunAt} /> : '—'}
            </TD>
            <TD>
              {row.strategy ? (
                <StatusBadge variant="mono" kind="neutral">
                  {formatStrategy(row.strategy)}
                </StatusBadge>
              ) : (
                <span style={{ color: 'var(--fg-subtle)' }}>—</span>
              )}
            </TD>
            <TD align="right" mono>
              {row.eventsFound}
            </TD>
            <TD align="right">
              <CostText value={row.cost} />
            </TD>
          </TR>
        ))}
      </tbody>
    </AdminTable>
  )
}
