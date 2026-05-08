'use client'

import type { SubmissionWithMeta } from '@concert-crawl/types'

interface CommunityPriceChipProps {
  topSubmission: SubmissionWithMeta
  submissionCount: number
  onConfirm: () => void
  onOpenVerify: () => void
}

export function CommunityPriceChip({
  topSubmission,
  submissionCount,
  onConfirm,
  onOpenVerify,
}: CommunityPriceChipProps) {
  const isCorroborated = topSubmission.status === 'corroborated'

  return (
    <div className="rounded-xl bg-surface-1 border border-border p-[14px] flex flex-col gap-[10px]">
      {/* Pills */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-fg-muted border border-border-strong rounded-full px-2 py-0.5">
          community
        </span>
        {isCorroborated ? (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-success border border-success rounded-full px-2 py-0.5">
            confirmed
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-warning border border-warning rounded-full px-2 py-0.5">
            pending
          </span>
        )}
      </div>

      {/* Price line */}
      <p className="text-[28px] font-black text-fg leading-none">
        ${topSubmission.priceMin}
        {topSubmission.priceMax ? ` – $${topSubmission.priceMax}` : ''}
        <span className="text-xs font-mono text-fg-muted uppercase ml-2">
          {topSubmission.tier}
        </span>
      </p>

      {/* Vendor line */}
      <p className="text-[11px] font-mono text-fg-muted">
        seen on {topSubmission.vendor}
      </p>

      {/* Attribution */}
      <p className="text-[11px] font-mono text-fg-subtle">
        Submitted by {submissionCount} {submissionCount === 1 ? 'fan' : 'fans'}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-dashed border-border">
        <button onClick={onConfirm} className="text-sm text-signal font-medium">
          Saw the same
        </button>
        <button
          onClick={onOpenVerify}
          className="text-sm text-fg-muted underline"
        >
          {submissionCount} {submissionCount === 1 ? 'report' : 'reports'} →
        </button>
      </div>
    </div>
  )
}
