import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import {
  SectionHead,
  AdminButton,
  StatCard,
  Panel,
} from '@/components/admin/primitives'
import type { VenueWithEventCount } from '@concert-crawl/types'
import { VenueTableClient } from '@/components/admin/venue-table-client'

type VenueStatus = 'active' | 'paused' | 'blocked'

function deriveVenueStatus(venue: VenueWithEventCount): VenueStatus {
  if (venue.blockedAt !== null) return 'blocked'
  if (!venue.active) return 'paused'
  return 'active'
}

function healthPercent(venue: VenueWithEventCount): number {
  return venue.consecutiveFailures === 0
    ? 100
    : Math.max(0, 100 - venue.consecutiveFailures * 20)
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminVenuesPage({ searchParams }: Props) {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const resolvedParams = await searchParams
  const rawStatus = resolvedParams.status
  const statusFilter = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus

  const venues = await apiClient
    .get<VenueWithEventCount[]>('/v1/admin/venues', token)
    .catch((err: unknown) => {
      throw new Error(
        `Failed to load venues: ${err instanceof Error ? err.message : String(err)}`,
      )
    })

  const activeCount = venues.filter(
    (venue) => deriveVenueStatus(venue) === 'active',
  ).length
  const pausedBlockedCount = venues.filter(
    (venue) => deriveVenueStatus(venue) !== 'active',
  ).length
  const avgHealth =
    venues.length > 0
      ? Math.round(
          venues.reduce((sum, venue) => sum + healthPercent(venue), 0) /
            venues.length,
        )
      : 0

  const filtered =
    statusFilter === 'active' ||
    statusFilter === 'paused' ||
    statusFilter === 'blocked'
      ? venues.filter((venue) => deriveVenueStatus(venue) === statusFilter)
      : venues

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionHead
        title="Venues"
        subtitle="Configure crawl targets. Crawls run daily at 3 AM MT."
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
          label="Total venues"
          value={String(venues.length)}
          iconName="MapPin"
          kind="neutral"
        />
        <StatCard
          label="Active"
          value={String(activeCount)}
          iconName="Activity"
          kind="success"
        />
        <StatCard
          label="Paused / Blocked"
          value={String(pausedBlockedCount)}
          iconName="AlertTriangle"
          kind="warning"
        />
        <StatCard
          label="Avg health · 7d"
          value={`${String(avgHealth)}%`}
          iconName="HeartPulse"
          kind={
            avgHealth >= 80 ? 'success' : avgHealth >= 50 ? 'warning' : 'danger'
          }
          hint="median run success rate"
        />
      </div>

      <Panel padding={0}>
        <VenueTableClient venues={filtered} currentFilter={statusFilter} />
      </Panel>
    </div>
  )
}
