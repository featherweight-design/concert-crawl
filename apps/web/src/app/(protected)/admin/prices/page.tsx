import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface HealthStat {
  venueId: string
  source: string
  hitCount: number
  totalCount: number
  lastAttemptedAt: string | null
}

interface HealthData {
  stats: HealthStat[]
  autoFlagged: Array<{ venueId: string; source: string }>
}

interface LogRow {
  id: string
  source: string
  outcome: string
  latencyMs: number
  attemptedAt: string
  errorMessage: string | null
}

interface CoverageData {
  total: number
  withPrice: number
  pct: number
}

interface SubmissionRow {
  id: string
  eventId: string
  userId: string
  priceMin: string
  priceMax: string | null
  status: string
  corroborationCount: number
  createdAt: string
}

export default async function AdminPricesPage() {
  const { getToken } = await auth()
  const token = await getToken()

  const [health, log, coverage, submissions] = await Promise.all([
    apiClient.get<HealthData>('/v1/admin/prices/health', token!),
    apiClient.get<LogRow[]>('/v1/admin/prices/log', token!),
    apiClient.get<CoverageData>('/v1/admin/prices/coverage', token!),
    apiClient.get<SubmissionRow[]>('/v1/admin/prices/submissions', token!),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Price Dashboard</h1>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">Pipeline Health</TabsTrigger>
          <TabsTrigger value="log">Retrieval Log</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          {health.autoFlagged.length > 0 && (
            <div className="mb-4 rounded border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <strong>
                {health.autoFlagged.length} source(s) auto-flagged
              </strong>{' '}
              — no hits in 30+ days.
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-fg-muted">
                <th className="py-2 pr-4">Venue ID</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Hit Rate</th>
                <th className="py-2">Last Attempt</th>
              </tr>
            </thead>
            <tbody>
              {health.stats.map((row) => (
                <tr key={`${row.venueId}-${row.source}`} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">
                    {row.venueId.slice(0, 8)}…
                  </td>
                  <td className="py-2 pr-4">{row.source}</td>
                  <td className="py-2 pr-4">
                    {row.totalCount > 0
                      ? `${Math.round((row.hitCount / row.totalCount) * 100)}%`
                      : '—'}{' '}
                    ({row.hitCount}/{row.totalCount})
                  </td>
                  <td className="py-2 text-xs text-fg-muted">
                    {row.lastAttemptedAt
                      ? new Date(row.lastAttemptedAt).toLocaleString('en-US', {
                          timeZone: 'America/Denver',
                        })
                      : 'never'}
                  </td>
                </tr>
              ))}
              {health.stats.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-fg-muted">
                    No pipeline attempts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="log">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-fg-muted">
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Outcome</th>
                <th className="py-2 pr-4">Latency</th>
                <th className="py-2 pr-4">Attempted</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {log.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-4">{row.source}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={
                        row.outcome === 'hit'
                          ? 'text-green-600'
                          : row.outcome === 'error'
                            ? 'text-destructive'
                            : 'text-fg-muted'
                      }
                    >
                      {row.outcome}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{row.latencyMs}ms</td>
                  <td className="py-2 pr-4 text-xs text-fg-muted">
                    {new Date(row.attemptedAt).toLocaleString('en-US', {
                      timeZone: 'America/Denver',
                    })}
                  </td>
                  <td className="py-2 text-xs text-fg-muted">
                    {row.errorMessage ?? '—'}
                  </td>
                </tr>
              ))}
              {log.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-fg-muted">
                    No retrieval attempts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="coverage">
          <div className="mt-4 space-y-2">
            <p className="text-4xl font-bold">{coverage.pct}%</p>
            <p className="text-sm text-fg-muted">
              {coverage.withPrice} of {coverage.total} upcoming events have
              price data.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="submissions">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-fg-muted">
                <th className="py-2 pr-4">Event ID</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Corroborations</th>
                <th className="py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-4 font-mono text-xs">
                    {row.eventId.slice(0, 8)}…
                  </td>
                  <td className="py-2 pr-4">
                    ${parseFloat(row.priceMin).toFixed(0)}
                    {row.priceMax && `–$${parseFloat(row.priceMax).toFixed(0)}`}
                  </td>
                  <td className="py-2 pr-4">{row.status}</td>
                  <td className="py-2 pr-4">{row.corroborationCount}</td>
                  <td className="py-2 text-xs text-fg-muted">
                    {new Date(row.createdAt).toLocaleDateString('en-US', {
                      timeZone: 'America/Denver',
                    })}
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-fg-muted">
                    No community submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TabsContent>
      </Tabs>
    </div>
  )
}
