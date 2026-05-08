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
  Sparkline,
} from '@/components/admin/primitives'

interface PriceActivity {
  eventId: string
  eventTitle: string | null
  venueName: string | null
  date: string | null
  currentPrice: number | null
  updatedAt: string
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
                <TH>Current</TH>
                <TH>14-day trend</TH>
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
                  <TD mono>
                    {row.currentPrice != null ? `$${row.currentPrice}` : '—'}
                  </TD>
                  <TD>
                    <Sparkline data={[]} />
                  </TD>
                  <TD color="var(--fg-muted)" mono>
                    {new Date(row.updatedAt).toLocaleDateString()}
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
