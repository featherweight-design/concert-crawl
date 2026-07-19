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
  //
  // Map both "missing" cases to Next's notFound:
  //   - 404: valid UUID but the row doesn't exist
  //   - 400: the API's Zod param validator rejects non-UUID :id strings
  //          (apps/api/src/routes/admin/events.ts — eventIdSchema), so
  //          /admin/events/<garbage>/edit is "not found" from the user's
  //          perspective, not a server error.
  // Anything else (auth, 5xx, network) propagates to Next's error boundary.
  let event: EditorEvent
  try {
    event = await apiClient.get<EditorEvent>(`/v1/admin/events/${id}`, token)
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      notFound()
    }
    throw error
  }

  // The admin shell's <main> already applies the section-level padding
  // (24px 28px desktop, 16px 14px mobile — see AdminShellClient). Dropping
  // the extra inner wrapper brings the editor's outer spacing in line with
  // /admin/review, which renders its client directly under the shell (#1082).
  return <EventEditorClient event={event} />
}
