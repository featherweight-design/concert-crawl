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
import { AddVenueButton } from '@/components/admin/venues/AddVenueButton'
import { VenueStatusFilterButton } from '@/components/admin/venues/VenueStatusFilterButton'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

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
        title={ADMIN_COPY.venuesPage.page.title}
        subtitle={ADMIN_COPY.venuesPage.page.subtitle(
          venues.length,
          blockedCount,
        )}
        actions={
          <>
            <VenueStatusFilterButton currentFilter={statusFilter} />
            <Link
              href="/admin/venues/robots-audit"
              style={{ textDecoration: 'none' }}
            >
              <AdminButton variant="outline" size="sm" icon={ExternalLink}>
                {ADMIN_COPY.venuesPage.page.robotsAuditButton}
              </AdminButton>
            </Link>
            <AddVenueButton placement="desktop" />
          </>
        }
      />

      {/* Stat row — matches Admin > Crawl: auto-fit lays out one 180px-min
          column per card as the container allows (single column at 320px, up to
          one track per StatCard on wide screens) and collapses empty tracks */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}
      >
        <StatCard
          label={ADMIN_COPY.venuesPage.stats.totalVenues}
          value={String(venues.length)}
          iconName="MapPin"
          kind="neutral"
          noChip
        />
        <StatCard
          label={ADMIN_COPY.venuesPage.stats.active}
          value={String(activeCount)}
          iconName="MapPin"
          kind="success"
        />
        <StatCard
          label={ADMIN_COPY.venuesPage.stats.pausedBlocked}
          value={String(pausedBlockedCount)}
          iconName="MapPin"
          kind="warning"
        />
        <StatCard
          label={ADMIN_COPY.venuesPage.stats.avgHealth}
          value={`${String(avgHealth)}%`}
          iconName="Activity"
          kind={
            avgHealth >= 80 ? 'success' : avgHealth >= 50 ? 'warning' : 'danger'
          }
          hint={ADMIN_COPY.venuesPage.stats.avgHealthHint}
        />
      </div>

      <AddVenueButton placement="mobile" />

      <Panel padding={0}>
        <VenueTableClient venues={filtered} />
      </Panel>
    </div>
  )
}
