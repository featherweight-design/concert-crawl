'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { ApiError, apiClient } from '@/lib/api'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { EditorHeader, type EditorHeaderEvent } from './EditorHeader'
import { type LifecycleStatus } from './LifecycleBadge'
import { IdentitySection } from './sections/IdentitySection'
import { PricingSection } from './sections/PricingSection'
import { ClassificationSection } from './sections/ClassificationSection'
import { StatusSection } from './sections/StatusSection'
import { ArtSection } from './sections/ArtSection'
import { SaveBar } from './SaveBar'

export interface EditorEvent {
  id: string
  title: string
  artist: string | null
  date: string
  doorsTime: string | null
  showTime: string | null
  ticketPriceMin: string | null
  ticketPriceMax: string | null
  confidenceScore: number | null
  verified: boolean
  status: LifecycleStatus
  extractionStrategy: string | null
  genre: string[] | null
  updatedAt: string | null
  venueId: string | null
  venueName: string | null
  isSoldOut: boolean
}

interface DraftState {
  status: LifecycleStatus
  verified: boolean
  date: string
}

const toDraft = (event: EditorEvent): DraftState => ({
  status: event.status,
  verified: event.verified,
  date: event.date,
})

interface PatchBody {
  status?: LifecycleStatus
  verified?: boolean
  date?: string
}

const computeDiff = (draft: DraftState, original: EditorEvent): PatchBody => {
  const body: PatchBody = {}
  if (draft.status !== original.status) body.status = draft.status
  if (draft.verified !== original.verified) body.verified = draft.verified
  if (draft.date !== original.date) body.date = draft.date
  return body
}

export interface EventEditorClientProps {
  event: EditorEvent
}

export const EventEditorClient = ({ event }: EventEditorClientProps) => {
  const router = useRouter()
  const { getToken } = useAuth()
  const [isDesktop, setIsDesktop] = useState(true)
  const [draft, setDraft] = useState<DraftState>(() => toDraft(event))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset the draft whenever the event prop identity changes (post-save
  // router.refresh() yields a fresh server-fetched event). The trade-off:
  // unsaved local edits are discarded on every parent re-render, which is
  // acceptable here because the parent (server component) only re-renders
  // after a successful save or a true navigation.
  useEffect(() => {
    setDraft(toDraft(event))
    setError(null)
  }, [event])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(mq.matches)
    const handler = (evt: MediaQueryListEvent) => setIsDesktop(evt.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const headerEvent: EditorHeaderEvent = {
    id: event.id,
    title: event.title,
    venueName: event.venueName,
    date: event.date,
    showTime: event.showTime,
    status: event.status,
    verified: event.verified,
  }

  const diff = computeDiff(draft, event)
  const dirty = Object.keys(diff).length > 0

  const onSave = useCallback(async () => {
    if (!dirty || saving) return
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.patch(`/v1/admin/events/${event.id}`, token, diff)
      router.refresh()
    } catch (saveErr) {
      const message =
        saveErr instanceof ApiError
          ? saveErr.message
          : ADMIN_COPY.editor.saveBar.saveFailed
      console.error('EventEditorClient save error:', saveErr)
      setError(message)
    } finally {
      setSaving(false)
    }
  }, [diff, dirty, event.id, getToken, router, saving])

  const onDiscard = useCallback(() => {
    setDraft(toDraft(event))
    setError(null)
  }, [event])

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        maxWidth: isDesktop ? 920 : '100%',
      }}
    >
      {isDesktop ? (
        <EditorHeader
          event={headerEvent}
          viewDetailHref={`/events/${event.id}`}
        />
      ) : (
        <EditorHeader event={headerEvent} />
      )}
      <IdentitySection event={event} />
      <PricingSection event={event} />
      <ClassificationSection genre={event.genre} />
      <StatusSection
        event={event}
        editedStatus={draft.status}
        editedVerified={draft.verified}
        editedDate={draft.date}
        onStatusChange={(next) =>
          setDraft((prev) => ({ ...prev, status: next }))
        }
        onVerifiedChange={(next) =>
          setDraft((prev) => ({ ...prev, verified: next }))
        }
        onDateChange={(next) => setDraft((prev) => ({ ...prev, date: next }))}
      />
      <ArtSection artist={event.artist} />
      <SaveBar
        dirty={dirty}
        saving={saving}
        error={error}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    </div>
  )
}
