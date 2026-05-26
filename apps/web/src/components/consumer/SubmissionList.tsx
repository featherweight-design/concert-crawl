'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { SubmissionWithMeta } from '@concert-crawl/types'
import { confirmPriceSubmission } from '@/lib/events'
import { CONSUMER_COPY } from '@/components/consumer/definitions/copy'

const copy = CONSUMER_COPY

interface SubmissionListProps {
  submissions: SubmissionWithMeta[]
  eventId: string
  currentUserId: string | null
}

function SubmissionCard({
  submission,
  eventId,
  currentUserId,
  onConfirm,
  isConfirming,
}: {
  submission: SubmissionWithMeta
  eventId: string
  currentUserId: string | null
  onConfirm: (id: string) => void
  isConfirming: boolean
}) {
  const router = useRouter()
  const isOwn = currentUserId != null && submission.userId === currentUserId
  const isPending = submission.status === 'pending'
  const isCorroborated = submission.status === 'corroborated'

  const timeAgo = (() => {
    const diff = Date.now() - new Date(submission.createdAt).getTime()
    const hrs = Math.floor(diff / 3600000)
    if (hrs < 1) return 'just now'
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  })()

  return (
    <div
      className={[
        'rounded-xl border p-4 flex flex-col gap-2',
        isOwn ? 'border-accent bg-accent/5' : 'border-border bg-surface-1',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {isCorroborated ? (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-success border border-success rounded-full px-2 py-0.5">
            {copy.submissionList.confirmedBadge}
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-warning border border-warning rounded-full px-2 py-0.5">
            {copy.submissionList.pendingBadge}
          </span>
        )}
        {isOwn && (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-accent border border-accent rounded-full px-2 py-0.5">
            {copy.submissionList.youBadge}
          </span>
        )}
        <span className="ml-auto text-xs text-fg-subtle font-mono">
          {timeAgo}
        </span>
      </div>

      <p className="text-xl font-black text-fg">
        ${submission.priceMin}
        {submission.priceMax ? ` – $${submission.priceMax}` : ''}{' '}
        <span className="text-xs font-mono text-fg-muted uppercase">
          {submission.tier}
        </span>
      </p>

      <p className="text-xs font-mono text-fg-muted">
        {copy.submissionList.seenOnPrefix} {submission.vendor} ·{' '}
        {submission.howFound.replace(/_/g, ' ')}
      </p>

      {!isOwn && (
        <div className="flex gap-3 pt-1 border-t border-border">
          {!submission.byYou && isPending && (
            <button
              onClick={() => !isConfirming && onConfirm(submission.id)}
              disabled={isConfirming}
              className="text-xs text-signal underline disabled:opacity-50 disabled:cursor-default"
            >
              {isConfirming
                ? copy.submissionList.confirmingLabel
                : copy.submissionList.confirmButton}
            </button>
          )}
          <button
            onClick={() =>
              router.push(
                `/events/${eventId}/submissions/${submission.id}/dispute`,
              )
            }
            className="text-xs text-danger underline"
          >
            {copy.submissionList.disputeButton}
          </button>
        </div>
      )}
    </div>
  )
}

export function SubmissionList({
  submissions,
  eventId,
  currentUserId,
}: SubmissionListProps) {
  const { getToken } = useAuth()
  const [localSubmissions, setLocalSubmissions] = useState(submissions)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  async function handleConfirm(submissionId: string) {
    setConfirmingId(submissionId)
    try {
      const token = await getToken()
      if (!token) return
      const result = await confirmPriceSubmission(
        eventId,
        submissionId,
        'same-vendor',
        token,
      )
      setLocalSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId
            ? {
                ...sub,
                confirms: result.confirmsCount,
                status: result.submissionStatus as SubmissionWithMeta['status'],
                byYou: true,
              }
            : sub,
        ),
      )
    } catch {
      // swallow — submission list will show stale data until next refresh
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {localSubmissions.map((sub) => (
        <SubmissionCard
          key={sub.id}
          submission={sub}
          eventId={eventId}
          currentUserId={currentUserId}
          onConfirm={handleConfirm}
          isConfirming={confirmingId !== null}
        />
      ))}
      {localSubmissions.length === 0 && (
        <p className="text-sm text-fg-subtle text-center py-4">
          {copy.submissionList.noSubmissions}
        </p>
      )}
    </div>
  )
}
