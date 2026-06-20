import { notFound } from 'next/navigation'
import { auth, requireAdminUser } from '@/lib/auth'
import { apiClient, ApiError } from '@/lib/api'
import { EventEditorClient } from '@/components/admin/events/editor/EventEditorClient'
import type { EditorEvent } from '@/components/admin/events/editor/EventEditorClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventEditorPage({ params }: PageProps) {
  await requireAdminUser()
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) return null

  const { id } = await params

  // apiClient.get already unwraps the { success, data } envelope and returns
  // body.data as T — so typing this as <EditorEvent> gives us the event directly.
  // Typing it as the envelope shape will silently always look "not found".
  // Only map 404 → notFound; let other errors propagate to Next's error
  // boundary so 500s / network failures don't get swallowed as "not found".
  let event: EditorEvent
  try {
    event = await apiClient.get<EditorEvent>(`/v1/admin/events/${id}`, token)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound()
    }
    throw error
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <EventEditorClient event={event} />
    </div>
  )
}
