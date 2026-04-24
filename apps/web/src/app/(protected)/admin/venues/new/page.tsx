import { VenueForm } from '@/components/admin/venue-form'
import { createVenue } from '@/lib/actions/venues'

export default function NewVenuePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add Venue</h1>
      <VenueForm action={createVenue} />
    </div>
  )
}
