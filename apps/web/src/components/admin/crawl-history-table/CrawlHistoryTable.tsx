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
  CRAWL_STATUS_BADGES,
  resolveCrawlAlertBadge,
} from './definitions/constants'
import { CrawlHistoryFilter } from './CrawlHistoryFilter'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

async function fetchCrawlHistory(
  venueId: string,
  hasAlert: boolean,
): Promise<CrawlRun[]> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) throw new Error('Not authenticated')

  const query = new URLSearchParams({ venueId, limit: '10' })
  if (hasAlert) query.set('hasAlert', 'true')
  return apiClient.get<CrawlRun[]>(`/v1/admin/crawl/runs?${query}`, token)
}

interface CrawlHistoryTableProps {
  venueId: string
  // When true, only crawl runs with an active admin alert are returned.
  // Driven by the "Show alerts only" filter — surfaced as a URL search
  // param so the server component re-renders without client state (#804).
  hasAlert?: boolean
  // Base path the filter's "Show all" / "Show alerts only" links point at.
  // The consumer page knows its own route; the component doesn't assume.
  // Defaults to the current path with the query stripped, derived by the
  // consumer.
  basePath?: string
}

export const CrawlHistoryTable = async ({
  venueId,
  hasAlert = false,
  basePath,
}: CrawlHistoryTableProps) => {
  const runs = await fetchCrawlHistory(venueId, hasAlert)

  return (
    <section aria-label={ADMIN_COPY.crawlHistoryTable.heading}>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h2 className="text-lg font-semibold">
          {ADMIN_COPY.crawlHistoryTable.heading}
        </h2>
        {basePath !== undefined && (
          <CrawlHistoryFilter basePath={basePath} hasAlert={hasAlert} />
        )}
      </div>
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
                ? resolveCrawlAlertBadge(run.activeAlert)
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
                          // Prepend the visible label so screen readers
                          // announce the specific failure mode ("Went dark"
                          // / "Failing"). Without the label, aria-label
                          // overrides the inner span text and the assistive
                          // announcement loses the specific severity.
                          aria-label={`${alertConfig.label}. ${ADMIN_COPY.crawlHistoryTable.alertBadgeAriaLabel}`}
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
