'use client'

import { useEffect } from 'react'

import {
  BrowseInstead,
  CREWS_COPY,
  DimmedMark,
  InviteBody,
  InviteEyebrow,
  InviteShell,
  InviteTitle,
  primaryButtonStyle,
} from '@/components/consumer/crews'
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry'

/**
 * Our failure, stated as ours. Deliberately not the expired or retired dead
 * end: those are normal outcomes of a link, and this is the connection.
 */
export default function CrewJoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const onRetry = useErrorBoundaryRetry(reset)

  useEffect(() => {
    console.error('[crews] invite landing boundary', error)
  }, [error])

  return (
    <InviteShell>
      <DimmedMark />
      <div className="flex max-w-[340px] flex-col items-center gap-[9px]">
        <InviteEyebrow tone="warning">
          {CREWS_COPY.net.errInviteEyebrow}
        </InviteEyebrow>
        <InviteTitle>{CREWS_COPY.net.errInviteTitle}</InviteTitle>
        <InviteBody>{CREWS_COPY.net.errInviteBody}</InviteBody>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer"
          style={primaryButtonStyle}
        >
          {CREWS_COPY.net.retry}
        </button>
        <BrowseInstead />
      </div>
    </InviteShell>
  )
}
