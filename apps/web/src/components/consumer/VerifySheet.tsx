'use client'

import type { SubmissionWithMeta } from '@concert-crawl/types'
import { SubmissionList } from './SubmissionList'

interface VerifySheetProps {
  open: boolean
  onClose: () => void
  submissions: SubmissionWithMeta[]
  eventId: string
  artistName: string
  venueName: string
  eventDate: string
  currentUserId: string | null
}

export function VerifySheet({
  open,
  onClose,
  submissions,
  eventId,
  artistName,
  venueName,
  eventDate,
  currentUserId,
}: VerifySheetProps) {
  if (!open) return null

  const dateStr = new Date(eventDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Denver',
  })

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[82vh] flex flex-col rounded-t-[20px] bg-bg overflow-hidden">
        {/* Grabber */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-strong" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-border">
          <p className="text-xs font-mono text-fg-muted uppercase tracking-wider">
            {artistName}
          </p>
          <p className="text-xs font-mono text-fg-subtle">
            {venueName} · {dateStr}
          </p>
          <p className="text-xs text-fg-muted mt-2">
            Confirm what you saw, dispute what looks off. Two confirms move a
            price out of <em>pending</em>.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SubmissionList
            submissions={submissions}
            eventId={eventId}
            currentUserId={currentUserId}
          />
        </div>

        {/* Close */}
        <div className="px-5 pb-6 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl border border-border-strong text-sm text-fg"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
