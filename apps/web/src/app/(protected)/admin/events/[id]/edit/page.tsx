import { notFound } from 'next/navigation'
import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient } from '@/lib/api'
import { EventEditorClient } from '@/components/admin/events/editor/EventEditorClient'
import type { EditorEvent } from '@/components/admin/events/editor/EventEditorClient'

interface PageProps {
  params: Promise<{ id: string }>
}

interface ApiResponse {
  success: boolean
  data?: EditorEvent
  error?: string
}

export default async function EventEditorPage({ params }: PageProps) {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const { id } = await params

  const response = await apiClient
    .get<ApiResponse>(`/v1/admin/events/${id}`, token)
    .catch(() => null)

  if (!response || !response.success || !response.data) {
    notFound()
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <EventEditorClient event={response.data} />
    </div>
  )
}
