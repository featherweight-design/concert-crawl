'use client'

import type { SubmissionWithMeta } from '@concert-crawl/types'
import { copy } from './definitions/copy'

interface CommunityPriceChipProps {
  topSubmission: SubmissionWithMeta
  submissionCount: number
  currentUserId: string | null
  onConfirm: () => void
  onOpenVerify: () => void
}

export function CommunityPriceChip({
  topSubmission,
  submissionCount,
  currentUserId,
  onConfirm,
  onOpenVerify,
}: CommunityPriceChipProps) {
  const isCorroborated = topSubmission.status === 'corroborated'
  const canConfirm =
    !topSubmission.byYou &&
    currentUserId != null &&
    topSubmission.userId !== currentUserId

  return (
    <div className="rounded-xl bg-surface-1 border border-border p-[14px] flex flex-col gap-[10px]">
      {/* Pills */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-fg-muted border border-border-strong rounded-full px-2 py-0.5">
          {copy.communityPriceChip.communityBadge}
        </span>
        {isCorroborated ? (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-success border border-success rounded-full px-2 py-0.5">
            {copy.communityPriceChip.confirmedBadge}
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-warning border border-warning rounded-full px-2 py-0.5">
            {copy.communityPriceChip.pendingBadge}
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
        {copy.communityPriceChip.seenOnPrefix} {topSubmission.vendor}
      </p>

      {/* Attribution */}
      <p className="text-[11px] font-mono text-fg-subtle">
        {copy.communityPriceChip.submittedByPrefix} {submissionCount}{' '}
        {submissionCount === 1
          ? copy.communityPriceChip.fanSingular
          : copy.communityPriceChip.fanPlural}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-dashed border-border">
        {canConfirm && (
          <button
            onClick={onConfirm}
            className="text-sm text-signal font-medium"
          >
            {copy.communityPriceChip.sawTheSame}
          </button>
        )}
        <button
          onClick={onOpenVerify}
          className="text-sm text-fg-muted underline"
        >
          {submissionCount}{' '}
          {submissionCount === 1
            ? copy.communityPriceChip.reportSingular
            : copy.communityPriceChip.reportPlural}{' '}
          →
        </button>
      </div>
    </div>
  )
}
