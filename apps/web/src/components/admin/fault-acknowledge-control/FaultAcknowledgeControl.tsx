'use client'

import { useState, useEffect, useRef, useId } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Check, Undo2 } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { DENVER_TIME_ZONE, formatISODate } from '@/lib/time'
import {
  AdminButton,
  MonoLabel,
  Panel,
  StatusBadge,
} from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import type {
  AcknowledgedFault,
  TriageCondition,
  TriageFault,
} from '@/components/admin/triage/definitions/types'
import { acknowledgementEvidence } from './lib/fault-acknowledgement'
import {
  fetchVenueFault,
  acknowledgeFault,
  unacknowledgeFault,
} from './lib/acknowledgements'

const COPY = ADMIN_COPY.faultAcknowledge

// The control sits above the run history it is judged against, so it owns the
// gap rather than the tab — the tab cannot know whether it rendered at all.
const STRIP_STYLE = { marginBottom: 12 }

const conditionLabel = (condition: TriageCondition): string =>
  ADMIN_COPY.triage.conditions[condition].label

interface FaultAcknowledgeControlProps {
  venueId: string
}

export const FaultAcknowledgeControl = ({
  venueId,
}: FaultAcknowledgeControlProps) => {
  const { getToken, isLoaded } = useAuth()
  const router = useRouter()
  const reasonId = useId()
  const [fault, setFault] = useState<TriageFault | null>(null)
  const [acknowledged, setAcknowledged] = useState<AcknowledgedFault | null>(
    null,
  )
  const [reason, setReason] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isUnmounted = useRef(false)
  const activeVenueId = useRef(venueId)

  useEffect(() => {
    isUnmounted.current = false
    return () => {
      isUnmounted.current = true
    }
  }, [])

  // The control sits in a split view, so `venueId` changes without a remount.
  // Every async write is gated on the venue still being the selected one, or a
  // slow read for the venue the operator left lands on the one they moved to.
  useEffect(() => {
    activeVenueId.current = venueId
    setFault(null)
    setAcknowledged(null)
    setReason('')
    setErrorMessage(null)
    setIsSaving(false)

    // A null token before Clerk hydrates is transient, but nothing else in
    // these deps changes when auth arrives — so reading it as "no fault"
    // strands the control for the rest of the session.
    if (!isLoaded) return

    const load = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const result = await fetchVenueFault(venueId, token)
        if (isUnmounted.current || activeVenueId.current !== venueId) return
        setFault(result.fault)
        setAcknowledged(result.acknowledged)
      } catch (loadErr) {
        // A triage read failing is not this tab's problem to report — the
        // control simply does not appear. It is still logged, or a control that
        // never renders is indistinguishable from a venue with no fault.
        console.error('fetchVenueFault error:', loadErr)
      }
    }
    void load()
  }, [venueId, getToken, isLoaded])

  const runSave = async (save: (token: string) => Promise<void>) => {
    const savedFor = venueId
    const isStale = () =>
      isUnmounted.current || activeVenueId.current !== savedFor
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const token = await getToken()
      if (!token) throw new Error(COPY.errors.notAuthenticated)
      await save(token)
      if (isStale()) return
      router.refresh()
      const refreshed = await fetchVenueFault(savedFor, token)
      if (isStale()) return
      setFault(refreshed.fault)
      setAcknowledged(refreshed.acknowledged)
      setReason('')
    } catch (err) {
      console.error('fault acknowledgement save error:', err)
      if (isStale()) return
      setErrorMessage(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : COPY.errors.failed,
      )
    } finally {
      // An abandoned save settling later must not clear the flag for whatever
      // the operator is doing now — the venue-change effect already reset it.
      if (!isStale()) setIsSaving(false)
    }
  }

  if (acknowledged !== null) {
    const { acknowledgement } = acknowledged
    return (
      <div style={STRIP_STYLE}>
        <Panel
          title={COPY.acknowledgedTitle}
          action={
            <StatusBadge>{conditionLabel(acknowledged.condition)}</StatusBadge>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <MonoLabel>{COPY.evidenceLabel}</MonoLabel>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: 'var(--fg)',
                }}
              >
                {acknowledgement.evidenceValue ?? COPY.noEvidence}
              </span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--fg)' }}>
              {acknowledgement.reason}
            </span>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
              {COPY.acknowledgedBy(
                acknowledgement.acknowledgedBy,
                formatISODate(acknowledgement.acknowledgedAt, DENVER_TIME_ZONE),
              )}
            </span>
            {errorMessage && (
              <span
                role="alert"
                style={{ fontSize: 12, color: 'var(--danger)' }}
              >
                {errorMessage}
              </span>
            )}
            <div>
              <AdminButton
                variant="outline"
                size="sm"
                icon={Undo2}
                disabled={isSaving}
                onClick={() =>
                  void runSave((token) =>
                    unacknowledgeFault(venueId, acknowledged.condition, token),
                  )
                }
              >
                {isSaving ? COPY.removing : COPY.remove}
              </AdminButton>
            </div>
          </div>
        </Panel>
      </div>
    )
  }

  if (fault === null) return null

  const evidence = acknowledgementEvidence(fault)

  return (
    <div style={STRIP_STYLE}>
      <Panel
        title={COPY.title}
        action={
          <StatusBadge kind="warning">
            {conditionLabel(fault.condition)}
          </StatusBadge>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            {COPY.body}
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <MonoLabel>{COPY.evidenceLabel}</MonoLabel>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: 'var(--fg)',
              }}
            >
              {evidence.evidenceValue ?? COPY.noEvidence}
            </span>
          </div>
          <label
            htmlFor={reasonId}
            style={{ fontSize: 12, color: 'var(--fg-muted)' }}
          >
            {COPY.reasonLabel}
          </label>
          <input
            id={reasonId}
            type="text"
            value={reason}
            maxLength={500}
            placeholder={COPY.reasonPlaceholder}
            onChange={(event) => setReason(event.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--fg)',
              fontSize: 13,
            }}
          />
          {errorMessage && (
            <span role="alert" style={{ fontSize: 12, color: 'var(--danger)' }}>
              {errorMessage}
            </span>
          )}
          <div>
            <AdminButton
              variant="primary"
              size="sm"
              icon={Check}
              disabled={isSaving || reason.trim().length === 0}
              onClick={() =>
                void runSave((token) =>
                  acknowledgeFault(
                    venueId,
                    {
                      condition: fault.condition,
                      evidenceKind: evidence.evidenceKind,
                      evidenceValue: evidence.evidenceValue,
                      reason: reason.trim(),
                    },
                    token,
                  ),
                )
              }
            >
              {isSaving ? COPY.confirming : COPY.confirm}
            </AdminButton>
          </div>
        </div>
      </Panel>
    </div>
  )
}
