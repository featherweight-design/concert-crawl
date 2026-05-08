import { auth } from '@clerk/nextjs/server'
import { requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import {
  Plus,
  MapPin,
  Activity,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
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
  StatCard,
  Panel,
} from '@/components/admin/primitives'
import type { Venue } from '@concert-crawl/types'

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export default async function AdminVenuesPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const venues = await apiClient
    .get<Venue[]>('/v1/admin/venues', token)
    .catch((err: unknown) => {
      throw new Error(
        `Failed to load venues: ${err instanceof Error ? err.message : String(err)}`,
      )
    })
  const activeVenues = venues.filter((venue) => venue.active)
  const inactiveVenues = venues.filter((venue) => !venue.active)
  const blockedVenueCount = venues.filter(
    (venue) => venue.blockedAt !== null,
  ).length

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
        <StatCard
          label="Total"
          value={String(venues.length)}
          icon={MapPin}
          kind="neutral"
        />
        <StatCard
          label="Active"
          value={String(activeVenues.length)}
          icon={Activity}
          kind="success"
        />
        <StatCard
          label="Inactive"
          value={String(inactiveVenues.length)}
          icon={AlertTriangle}
          kind="warning"
          hint={
            blockedVenueCount > 0
              ? `${String(blockedVenueCount)} blocked`
              : undefined
          }
        />
        <StatCard
          label="Verified"
          value={String(venues.filter((venue) => venue.verified).length)}
          icon={ShieldCheck}
          kind="signal"
        />
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
              <TH>robots.txt</TH>
              <TH>Strategy</TH>
              <TH>Health</TH>
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
                    {safeHostname(venue.websiteUrl)}
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
                  {venue.robotsTxtAllowed === null ? (
                    <StatusBadge kind="neutral">unchecked</StatusBadge>
                  ) : venue.robotsTxtAllowed ? (
                    <StatusBadge kind="success" dot>
                      allowed
                    </StatusBadge>
                  ) : (
                    <StatusBadge kind="danger" dot>
                      blocked
                    </StatusBadge>
                  )}
                </TD>
                <TD>
                  {venue.extractionStrategy ? (
                    <StatusBadge
                      kind={
                        venue.extractionStrategy === 'llm' ? 'accent' : 'signal'
                      }
                      variant="outline"
                    >
                      {venue.extractionStrategy}
                    </StatusBadge>
                  ) : (
                    <span style={{ color: 'var(--fg-subtle)' }}>—</span>
                  )}
                </TD>
                <TD>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background:
                          venue.consecutiveFailures === 0
                            ? 'var(--success)'
                            : venue.consecutiveFailures >= 3
                              ? 'var(--danger)'
                              : 'var(--warning)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {venue.consecutiveFailures === 0
                        ? '100%'
                        : `${String(Math.max(0, 100 - venue.consecutiveFailures * 20))}%`}
                    </span>
                  </div>
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
