import { ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import {
  SectionHead,
  StatCard,
  Panel,
  AdminButton,
} from '@/components/admin/primitives'
import type { VenueWithEventCount } from '@concert-crawl/types'
import { VenueTableClient } from '@/components/admin/venue-table-client'
import { deriveVenueStatus, venueHealthPercent } from '@/lib/admin/venue-status'
import { MobileAddVenueButton } from '@/components/admin/venues/MobileAddVenueButton'
import { VenueStatusFilterButton } from '@/components/admin/venues/VenueStatusFilterButton'

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
  const blockedCount = venues.filter(
    (venue) => deriveVenueStatus(venue) === 'blocked',
  ).length
  const pausedBlockedCount = venues.filter(
    (venue) => deriveVenueStatus(venue) !== 'active',
  ).length
  const avgHealth =
    venues.length > 0
      ? Math.round(
          venues.reduce((sum, venue) => sum + venueHealthPercent(venue), 0) /
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
        subtitle={`${venues.length} configured · ${blockedCount} blocked.`}
        actions={
          <>
            <VenueStatusFilterButton currentFilter={statusFilter} />
            <Link
              href="/admin/venues/robots-audit"
              style={{ textDecoration: 'none' }}
            >
              <AdminButton variant="outline" size="sm" icon={ExternalLink}>
                robots.txt audit
              </AdminButton>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total venues"
          value={String(venues.length)}
          iconName="MapPin"
          kind="neutral"
          noChip
        />
        <StatCard
          label="Active"
          value={String(activeCount)}
          iconName="MapPin"
          kind="success"
        />
        <StatCard
          label="Paused / Blocked"
          value={String(pausedBlockedCount)}
          iconName="MapPin"
          kind="warning"
        />
        <StatCard
          label="Avg health · 7d"
          value={`${String(avgHealth)}%`}
          iconName="Activity"
          kind={
            avgHealth >= 80 ? 'success' : avgHealth >= 50 ? 'warning' : 'danger'
          }
          hint="average run success rate"
        />
      </div>

      <MobileAddVenueButton />

      <Panel padding={0}>
        <VenueTableClient venues={filtered} />
      </Panel>
    </div>
  )
}
