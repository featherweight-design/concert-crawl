import { auth } from '@clerk/nextjs/server'
import { apiClient } from '@/lib/api'
import type { Venue } from '@concert-crawl/types'
import { VenueTable } from '@/components/admin/venue-table'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default async function VenuesPage() {
  const { getToken } = await auth()
  const token = await getToken()
  const venues = await apiClient.get<Venue[]>('/v1/admin/venues', token!)

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
