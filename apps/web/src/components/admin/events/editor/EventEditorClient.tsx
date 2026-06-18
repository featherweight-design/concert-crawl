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
import { DangerZoneSection } from './sections/DangerZoneSection'
import { type SoldOutProvenance } from './sections/StatusSection'
import { SaveBar } from './SaveBar'
import { EventConfirmModal } from '@/components/admin/review/all/EventConfirmModal'
import { MergeEventDialog } from './MergeEventDialog'
import { editEventHref } from '@/lib/admin/edit-event-link'

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
  isSoldOut: boolean
  provenance: SoldOutProvenance
}

const emptyProvenance = (): SoldOutProvenance => ({
  method: 'other',
  url: '',
  note: '',
})

const toDraft = (event: EditorEvent): DraftState => ({
  status: event.status,
  verified: event.verified,
  date: event.date,
  isSoldOut: event.isSoldOut,
  provenance: emptyProvenance(),
})

interface PatchBody {
  status?: LifecycleStatus
  verified?: boolean
  date?: string
}

const computePatchDiff = (
  draft: DraftState,
  original: EditorEvent,
): PatchBody => {
  const body: PatchBody = {}
  if (draft.status !== original.status) body.status = draft.status
  if (draft.verified !== original.verified) body.verified = draft.verified
  if (draft.date !== original.date) body.date = draft.date
  return body
}

const provenanceToBody = (provenance: SoldOutProvenance) => {
  const body: {
    evidenceMethod: SoldOutProvenance['method']
    evidenceUrl?: string
    note?: string
  } = { evidenceMethod: provenance.method }
  if (provenance.url.trim()) body.evidenceUrl = provenance.url.trim()
  if (provenance.note.trim()) body.note = provenance.note.trim()
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
  const [pendingDanger, setPendingDanger] = useState<
    'non-concert' | 'delete' | null
  >(null)
  const [dangerPending, setDangerPending] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)

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

  const patchDiff = computePatchDiff(draft, event)
  const soldOutChanged = draft.isSoldOut !== event.isSoldOut
  const dirty = Object.keys(patchDiff).length > 0 || soldOutChanged

  const onSave = useCallback(async () => {
    if (!dirty || saving) return
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      if (Object.keys(patchDiff).length > 0) {
        await apiClient.patch(`/v1/admin/events/${event.id}`, token, patchDiff)
      }
      if (soldOutChanged) {
        if (draft.isSoldOut) {
          await apiClient.post(
            `/v1/admin/events/${event.id}/sold-out`,
            token,
            provenanceToBody(draft.provenance),
          )
        } else {
          await apiClient.post(
            `/v1/admin/events/${event.id}/available`,
            token,
            {},
          )
        }
      }
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
  }, [
    draft.isSoldOut,
    draft.provenance,
    dirty,
    event.id,
    getToken,
    patchDiff,
    router,
    saving,
    soldOutChanged,
  ])

  const onDiscard = useCallback(() => {
    setDraft(toDraft(event))
    setError(null)
  }, [event])

  const onConfirmDanger = useCallback(async () => {
    if (!pendingDanger) return
    setDangerPending(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      if (pendingDanger === 'non-concert') {
        await apiClient.patch(`/v1/admin/events/${event.id}`, token, {
          hiddenFromConsumer: true,
        })
        setPendingDanger(null)
        router.refresh()
      } else {
        await apiClient.delete(`/v1/admin/events/${event.id}`, token)
        // Clear the pending state BEFORE redirecting so the modal can't be
        // re-armed if navigation is delayed (would otherwise allow a second
        // DELETE on the now-deleted row).
        setPendingDanger(null)
        router.push('/admin/review?tab=all-events')
      }
    } catch (dangerErr) {
      const message =
        dangerErr instanceof ApiError
          ? dangerErr.message
          : ADMIN_COPY.editor.saveBar.saveFailed
      console.error('EventEditorClient danger action error:', dangerErr)
      setError(message)
    } finally {
      setDangerPending(false)
    }
  }, [event.id, getToken, pendingDanger, router])

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
        editedIsSoldOut={draft.isSoldOut}
        editedProvenance={draft.provenance}
        onStatusChange={(next) =>
          setDraft((prev) => ({ ...prev, status: next }))
        }
        onVerifiedChange={(next) =>
          setDraft((prev) => ({ ...prev, verified: next }))
        }
        onDateChange={(next) => setDraft((prev) => ({ ...prev, date: next }))}
        onSoldOutChange={(next) =>
          setDraft((prev) => ({ ...prev, isSoldOut: next }))
        }
        onProvenanceChange={(next) =>
          setDraft((prev) => ({ ...prev, provenance: next }))
        }
      />
      <ArtSection artist={event.artist} />
      <DangerZoneSection
        onMarkNonConcert={() => setPendingDanger('non-concert')}
        onMerge={() => setMergeOpen(true)}
        onDelete={() => setPendingDanger('delete')}
        disabled={saving || dangerPending}
      />
      <SaveBar
        dirty={dirty}
        saving={saving}
        error={error}
        onSave={onSave}
        onDiscard={onDiscard}
      />
      {pendingDanger && (
        <EventConfirmModal
          kind={pendingDanger}
          event={{
            title: event.title,
            venueName: event.venueName,
            date: event.date,
            showTime: event.showTime,
          }}
          pending={dangerPending}
          onCancel={() => setPendingDanger(null)}
          onConfirm={onConfirmDanger}
        />
      )}
      {mergeOpen && (
        <MergeEventDialog
          sourceId={event.id}
          sourceTitle={event.title}
          onCancel={() => setMergeOpen(false)}
          onMerged={(targetId) => {
            // Source is gone — point the admin at the canonical target's editor.
            setMergeOpen(false)
            router.push(editEventHref(targetId))
          }}
        />
      )}
    </div>
  )
}
