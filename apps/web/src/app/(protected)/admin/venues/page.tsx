import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import type { Venue } from '@concert-crawl/types'
import { VenueTable } from '@/components/admin/venue-table'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default async function VenuesPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let venues: Venue[]
  try {
    venues = await apiClient.get<Venue[]>('/v1/admin/venues', token!)
  } catch (err) {
    console.error('[admin/venues] failed to load venues:', err)
    throw err
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Venues</h1>
        <Link href="/admin/venues/new" className={buttonVariants()}>
          Add Venue
        </Link>
      </div>
      <VenueTable venues={venues} />
    </div>
  )
}
