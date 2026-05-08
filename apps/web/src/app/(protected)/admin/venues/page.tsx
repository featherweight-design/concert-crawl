import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import {
  SectionHead,
  AdminButton,
  AdminTable,
  THead,
  TR,
  TH,
  TD,
  StatusBadge,
  Panel,
} from '@/components/admin/primitives'
import type { Venue } from '@concert-crawl/types'

export default async function AdminVenuesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const venues = await apiClient.get<Venue[]>('/v1/admin/venues', token)
  const activeVenues = venues.filter((venue) => venue.active)
  const inactiveVenues = venues.filter((venue) => !venue.active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        title="Venues"
        actions={
          <Link href="/admin/venues/new">
            <AdminButton variant="primary" icon={Plus}>
              Add venue
            </AdminButton>
          </Link>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
      >
        {[
          { label: 'Total', value: venues.length },
          { label: 'Active', value: activeVenues.length },
          { label: 'Inactive', value: inactiveVenues.length },
          {
            label: 'Verified',
            value: venues.filter((venue) => venue.verified).length,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '16px 20px',
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: 'var(--fg-muted)',
                marginBottom: 6,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <Panel title="All venues" padding={0}>
        <AdminTable>
          <THead>
            <tr>
              <TH>Venue</TH>
              <TH>Website</TH>
              <TH>Status</TH>
              <TH>Verified</TH>
              <TH>Crawl delay</TH>
              <TH></TH>
            </tr>
          </THead>
          <tbody>
            {venues.map((venue) => (
              <TR key={venue.id}>
                <TD>
                  <div style={{ fontWeight: 500 }}>{venue.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                    {venue.slug}
                  </div>
                </TD>
                <TD mono color="var(--fg-muted)">
                  <a
                    href={venue.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--signal)', textDecoration: 'none' }}
                  >
                    {new URL(venue.websiteUrl).hostname}
                  </a>
                </TD>
                <TD>
                  <StatusBadge kind={venue.active ? 'success' : 'neutral'} dot>
                    {venue.active ? 'Active' : 'Inactive'}
                  </StatusBadge>
                </TD>
                <TD>
                  <StatusBadge kind={venue.verified ? 'success' : 'warning'}>
                    {venue.verified ? 'Verified' : 'Unverified'}
                  </StatusBadge>
                </TD>
                <TD mono color="var(--fg-muted)">
                  {`${venue.crawlDelayMs / 1000}s`}
                </TD>
                <TD>
                  <Link href={`/admin/venues/${venue.id}`}>
                    <AdminButton variant="ghost" size="sm">
                      Edit
                    </AdminButton>
                  </Link>
                </TD>
              </TR>
            ))}
          </tbody>
        </AdminTable>
      </Panel>
    </div>
  )
}
