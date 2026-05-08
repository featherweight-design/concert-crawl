import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import {
  SectionHead,
  Panel,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
  RelTime,
} from '@/components/admin/primitives'
import type { StatusKind } from '@/components/admin/primitives'

interface PriceActivity {
  eventId: string
  eventTitle: string | null
  venueName: string | null
  date: string | null
  outcome: 'hit' | 'miss' | 'error'
  updatedAt: string
}

const OUTCOME_KIND: Record<string, StatusKind> = {
  hit: 'success',
  miss: 'warning',
  error: 'danger',
}

export default async function AdminPricesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const activity = await apiClient
    .get<PriceActivity[]>('/v1/admin/prices/activity', token)
    .catch(() => [] as PriceActivity[])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead title="Prices" />
      <Panel title="Recent price activity" padding={0}>
        {activity.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--fg-muted)', fontSize: 14 }}>
            No price activity yet.
          </div>
        ) : (
          <AdminTable>
            <THead>
              <tr>
                <TH>Event</TH>
                <TH>Outcome</TH>
                <TH>Updated</TH>
              </tr>
            </THead>
            <tbody>
              {activity.map((row) => (
                <TR key={row.eventId}>
                  <TD>
                    <div style={{ fontWeight: 500 }}>
                      {row.eventTitle ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                      {row.venueName ?? '—'}
                      {row.date
                        ? ` · ${new Date(row.date).toLocaleDateString()}`
                        : ''}
                    </div>
                  </TD>
                  <TD>
                    <StatusBadge
                      kind={OUTCOME_KIND[row.outcome] ?? 'neutral'}
                      dot
                    >
                      {row.outcome}
                    </StatusBadge>
                  </TD>
                  <TD color="var(--fg-muted)">
                    <RelTime iso={row.updatedAt} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  )
}
