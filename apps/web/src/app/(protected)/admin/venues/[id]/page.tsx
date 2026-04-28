import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import type { Venue } from '@concert-crawl/types'
import { VenueForm } from '@/components/admin/venue-form'
import { CrawlTriggerButton } from '@/components/admin/crawl-trigger-button'
import { CrawlHistoryTable } from '@/components/admin/crawl-history-table'
import { updateVenue } from '@/lib/actions/venues'
import { notFound } from 'next/navigation'

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

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Edit Venue — {venue.name}</h1>
      <VenueForm venue={venue} action={action} />
      <hr />
      <CrawlTriggerButton venueId={venue.id} />
      <CrawlHistoryTable venueId={venue.id} />
    </div>
  )
}
