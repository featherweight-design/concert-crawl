import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { SectionHead, AdminButton } from '@/components/admin/primitives'
import { EventQueueSplit } from '@/components/admin/events/EventQueueSplit'
import { Plus } from 'lucide-react'

export interface AdminEvent {
  id: string
  title: string
  artist: string
  venueId: string | null
  venueName: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: string | null
  extractionStrategy: string | null
  sourceUrl: string | null
  genre: string[] | null
  createdAt: string
  verified: boolean
}

export default async function AdminEventsPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const events = await apiClient.get<AdminEvent[]>(
    '/v1/admin/events?verified=false&limit=500',
    token,
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        height: '100%',
      }}
    >
      <SectionHead
        eyebrow="Review"
        title="Event flags"
        subtitle="Events below the 0.70 confidence threshold — auto-approved events don't appear here."
        actions={
          <AdminButton variant="primary" icon={Plus}>
            New event
          </AdminButton>
        }
      />
      <EventQueueSplit initialEvents={events} />
    </div>
  )
}
