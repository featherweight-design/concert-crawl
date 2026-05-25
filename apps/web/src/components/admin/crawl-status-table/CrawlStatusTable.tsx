import { Badge } from '@/components/ui/badge'
import { COPY } from './definitions/copy'

type LastRun = {
  id: string
  status: string
  createdAt: string
  eventsFound: number
  eventsInserted: number
  errorMessage: string | null
  extractionStrategyUsed: string | null
} | null

type VenueCrawlStatus = {
  id: string
  name: string
  active: boolean
  verified: boolean
  consecutiveFailures: number
  blockedAt: string | null
  lastCrawledAt: string | null
  lastRun: LastRun
}

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  success: 'default',
  partial: 'secondary',
  failed: 'destructive',
  in_progress: 'outline',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

type Props = {
  venues: VenueCrawlStatus[]
}

export const CrawlStatusTable = ({ venues }: Props) => {
  if (venues.length === 0) {
    return <p className="text-sm text-fg-muted">{COPY.empty}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-fg-muted">
            <th className="pb-3 pr-4 font-medium">{COPY.columns.venue}</th>
            <th className="pb-3 pr-4 font-medium">{COPY.columns.lastCrawl}</th>
            <th className="pb-3 pr-4 font-medium">{COPY.columns.status}</th>
            <th className="pb-3 pr-4 font-medium">{COPY.columns.events}</th>
            <th className="pb-3 pr-4 font-medium">{COPY.columns.strategy}</th>
            <th className="pb-3 font-medium">{COPY.columns.failures}</th>
          </tr>
        </thead>
        <tbody>
          {venues.map((venue) => (
            <tr
              key={venue.id}
              className="border-b border-border/50 last:border-0"
            >
              <td className="py-3 pr-4 font-medium text-fg">
                {venue.name}
                {!venue.active && (
                  <span className="ml-2 text-xs text-fg-muted">
                    {COPY.statusLabels.paused}
                  </span>
                )}
                {venue.blockedAt && (
                  <span className="ml-2 text-xs text-red-500">
                    {COPY.statusLabels.blocked}
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-fg-muted">
                {formatDate(venue.lastRun?.createdAt ?? null)}
              </td>
              <td className="py-3 pr-4">
                {venue.lastRun ? (
                  <Badge
                    variant={statusVariant[venue.lastRun.status] ?? 'outline'}
                  >
                    {venue.lastRun.status}
                  </Badge>
                ) : (
                  <span className="text-fg-muted">
                    {COPY.statusLabels.never}
                  </span>
                )}
              </td>
              <td className="py-3 pr-4 text-fg-muted">
                {venue.lastRun
                  ? `${venue.lastRun.eventsInserted}↑ / ${venue.lastRun.eventsFound} found`
                  : '—'}
              </td>
              <td className="py-3 pr-4 text-fg-muted">
                {venue.lastRun?.extractionStrategyUsed ?? '—'}
              </td>
              <td className="py-3">
                {venue.consecutiveFailures > 0 ? (
                  <span className="text-red-500">
                    {venue.consecutiveFailures}
                  </span>
                ) : (
                  <span className="text-fg-muted">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
