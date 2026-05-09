import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import type { Venue } from '@concert-crawl/types'
import { VenueForm } from '@/components/admin/venue-form'
import { CrawlTriggerButton } from '@/components/admin/crawl-trigger-button'
import { CrawlHistoryTable } from '@/components/admin/crawl-history-table'
import { updateVenue, verifyVenue, unverifyVenue } from '@/lib/actions/venues'
import { AdminButton, StatusBadge } from '@/components/admin/primitives'
import { notFound } from 'next/navigation'
import { ShieldCheck, ShieldOff } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditVenuePage({ params }: Props) {
  const { id } = await params
  const { getToken } = await auth()
  const token = await getToken()

  let venue: Venue
  try {
    venue = await apiClient.get<Venue>(`/v1/admin/venues/${id}`, token!)
  } catch {
    notFound()
  }

  const action = updateVenue.bind(null, id)
  const verifyAction = verifyVenue.bind(null, id)
  const unverifyAction = unverifyVenue.bind(null, id)

  return (
    <div className="space-y-8">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 className="text-2xl font-bold">Edit Venue — {venue.name}</h1>
        <StatusBadge kind={venue.verified ? 'success' : 'warning'}>
          {venue.verified ? 'Verified' : 'Unverified'}
        </StatusBadge>
      </div>

      <VenueForm venue={venue} action={action} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 0',
          borderTop: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: 'var(--fg-muted)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Verification status:
        </span>
        {venue.verified ? (
          <form action={unverifyAction}>
            <AdminButton type="submit" variant="danger" icon={ShieldOff}>
              Unverify venue
            </AdminButton>
          </form>
        ) : (
          <form action={verifyAction}>
            <AdminButton type="submit" variant="success" icon={ShieldCheck}>
              Verify venue
            </AdminButton>
          </form>
        )}
      </div>

      <hr />
      <CrawlTriggerButton venueId={venue.id} />
      <CrawlHistoryTable venueId={venue.id} />
    </div>
  )
}
