import { auth } from '@clerk/nextjs/server'
import type { CrawlRun } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'
import { formatISODate, formatDurationMs } from '@/lib/time'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CRAWL_STATUS_BADGES } from './definitions/constants'
import { copy } from './definitions/copy'

const TIME_ZONE = 'America/Denver'

async function fetchCrawlHistory(venueId: string): Promise<CrawlRun[]> {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return []

  try {
    return await apiClient.get<CrawlRun[]>(
      `/v1/admin/crawl/runs?venueId=${venueId}&limit=10`,
      token,
    )
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'crawl_history.fetch_error',
        venueId,
        error: String(err),
      }),
    )
    return []
  }
}

interface CrawlHistoryTableProps {
  venueId: string
}

export const CrawlHistoryTable = async ({
  venueId,
}: CrawlHistoryTableProps) => {
  const runs = await fetchCrawlHistory(venueId)

  return (
    <section aria-label={copy.heading}>
      <h2 className="text-lg font-semibold mb-3">{copy.heading}</h2>
      {runs.length === 0 ? (
        <p className="text-sm text-slate-500">{copy.empty}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{copy.columns.timestamp}</TableHead>
              <TableHead>{copy.columns.status}</TableHead>
              <TableHead>{copy.columns.strategy}</TableHead>
              <TableHead className="text-right">
                {copy.columns.eventsFound}
              </TableHead>
              <TableHead className="text-right">
                {copy.columns.eventsInserted}
              </TableHead>
              <TableHead>{copy.columns.duration}</TableHead>
              <TableHead>{copy.columns.error}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => {
              const badgeConfig =
                run.status !== 'in_progress'
                  ? CRAWL_STATUS_BADGES[run.status]
                  : null

              return (
                <TableRow key={run.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatISODate(run.createdAt, TIME_ZONE)} {copy.timeSuffix}
                  </TableCell>
                  <TableCell>
                    {badgeConfig ? (
                      <Badge variant={badgeConfig.variant}>
                        {badgeConfig.label}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">In Progress</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {run.extractionStrategyUsed ?? copy.noValue}
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
                      : copy.noValue}
                  </TableCell>
                  <TableCell className="text-xs text-red-500 max-w-xs truncate">
                    {run.errorMessage ?? copy.noValue}
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
