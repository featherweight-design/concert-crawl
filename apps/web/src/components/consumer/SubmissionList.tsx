'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import type { SubmissionWithMeta } from '@concert-crawl/types'

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
}: {
  submission: SubmissionWithMeta
  eventId: string
  currentUserId: string | null
  onConfirm: (id: string) => void
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
            confirmed
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-warning border border-warning rounded-full px-2 py-0.5">
            pending
          </span>
        )}
        {isOwn && (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-accent border border-accent rounded-full px-2 py-0.5">
            you
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
        seen on {submission.vendor} · {submission.howFound.replace(/_/g, ' ')}
      </p>

      {!isOwn && (
        <div className="flex gap-3 pt-1 border-t border-border">
          {!submission.byYou && isPending && (
            <button
              onClick={() => onConfirm(submission.id)}
              className="text-xs text-signal underline"
            >
              Confirm
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
            Dispute
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

  async function handleConfirm(submissionId: string) {
    const token = await getToken()
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/v1/submissions/${submissionId}/confirm`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
    if (res.ok) {
      const data = (await res.json()) as {
        data: { confirms: number; status: SubmissionWithMeta['status'] }
      }
      setLocalSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId
            ? {
                ...sub,
                confirms: data.data.confirms,
                status: data.data.status,
              }
            : sub,
        ),
      )
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
        />
      ))}
      {localSubmissions.length === 0 && (
        <p className="text-sm text-fg-subtle text-center py-4">
          No submissions yet.
        </p>
      )}
    </div>
  )
}
