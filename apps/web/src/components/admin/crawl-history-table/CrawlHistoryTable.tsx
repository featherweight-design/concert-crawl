import { auth } from '@clerk/nextjs/server'
import type { CrawlRun } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'
import { formatISODate, formatDurationMs, DENVER_TIME_ZONE } from '@/lib/time'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CRAWL_ALERT_BADGES,
  CRAWL_STATUS_BADGES,
} from './definitions/constants'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

async function fetchCrawlHistory(venueId: string): Promise<CrawlRun[]> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')

  return apiClient.get<CrawlRun[]>(
    `/v1/admin/crawl/runs?venueId=${venueId}&limit=10`,
    token,
  )
}

interface CrawlHistoryTableProps {
  venueId: string
}

export const CrawlHistoryTable = async ({
  venueId,
}: CrawlHistoryTableProps) => {
  const runs = await fetchCrawlHistory(venueId)

  return (
    <section aria-label={ADMIN_COPY.crawlHistoryTable.heading}>
      <h2 className="text-lg font-semibold mb-3">
        {ADMIN_COPY.crawlHistoryTable.heading}
      </h2>
      {runs.length === 0 ? (
        <p className="text-sm text-fg-muted">
          {ADMIN_COPY.crawlHistoryTable.empty}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {ADMIN_COPY.crawlHistoryTable.columns.timestamp}
              </TableHead>
              <TableHead>
                {ADMIN_COPY.crawlHistoryTable.columns.status}
              </TableHead>
              <TableHead>
                {ADMIN_COPY.crawlHistoryTable.columns.strategy}
              </TableHead>
              <TableHead className="text-right">
                {ADMIN_COPY.crawlHistoryTable.columns.eventsFound}
              </TableHead>
              <TableHead className="text-right">
                {ADMIN_COPY.crawlHistoryTable.columns.eventsInserted}
              </TableHead>
              <TableHead>
                {ADMIN_COPY.crawlHistoryTable.columns.duration}
              </TableHead>
              <TableHead>
                {ADMIN_COPY.crawlHistoryTable.columns.error}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const badgeConfig =
                run.status !== 'in_progress'
                  ? CRAWL_STATUS_BADGES[run.status]
                  : null
              const alertConfig = run.activeAlert
                ? CRAWL_ALERT_BADGES[run.activeAlert.category]
                : null

              return (
                <TableRow key={run.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatISODate(run.createdAt, DENVER_TIME_ZONE)}{' '}
                    {ADMIN_COPY.crawlHistoryTable.timeSuffix}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {badgeConfig ? (
                        <Badge variant={badgeConfig.variant}>
                          {badgeConfig.label}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">In Progress</Badge>
                      )}
                      {alertConfig && (
                        <Badge
                          variant={alertConfig.variant}
                          title={ADMIN_COPY.crawlHistoryTable.alertBadgeTitle}
                        >
                          {alertConfig.label}
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    {run.extractionStrategyUsed ??
                      ADMIN_COPY.crawlHistoryTable.noValue}
                  </TableCell>
                  <TableCell className="text-right">
                    {run.eventsFound}
                  </TableCell>
                  <TableCell className="text-right">
                    {run.eventsInserted}
                  </TableCell>
                  <TableCell>
                    {run.durationMs !== null
                      ? formatDurationMs(run.durationMs)
                      : ADMIN_COPY.crawlHistoryTable.noValue}
                  </TableCell>
                  <TableCell
                    className={`text-xs max-w-xs truncate ${run.errorMessage ? 'text-danger' : 'text-fg-muted'}`}
                  >
                    {run.errorMessage ?? ADMIN_COPY.crawlHistoryTable.noValue}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
