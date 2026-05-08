import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { SectionHead, AdminButton } from '@/components/admin/primitives'
import { EventQueueSplit } from '@/components/admin/events/EventQueueSplit'
import { Plus } from 'lucide-react'

interface AdminEvent {
  id: string
  title: string
  artist: string
  venue?: { name: string }
  date: string
  doorsTime?: string | null
  showTime?: string | null
  confidenceScore: string | null
  extractionStrategy: string | null
  sourceUrl: string | null
  verified: boolean
}

export default async function AdminEventsPage() {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const events = await apiClient.get<AdminEvent[]>(
    '/v1/admin/events?verified=false',
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
        title="Event review"
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
