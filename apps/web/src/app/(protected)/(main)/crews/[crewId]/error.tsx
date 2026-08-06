'use client'

import { useEffect } from 'react'

import { EmptyState } from '@/components/consumer/empty-state'
import { CREWS_COPY } from '@/components/consumer/crews'
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry'

export default function CrewError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const onRetry = useErrorBoundaryRetry(reset)

  useEffect(() => {
    console.error('[crews] crew home boundary', error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-3 px-4 pb-10 pt-5">
      <EmptyState
        state="error"
        density="dense"
        eyebrow={CREWS_COPY.net.errCrewEyebrow}
        title={CREWS_COPY.net.errCrewTitle}
        body={CREWS_COPY.net.errCrewBody}
      />
      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer"
        style={{
          minHeight: 44,
          padding: '0 20px',
          borderRadius: 999,
          background: 'var(--signal)',
          color: 'var(--fg-on-accent)',
          border: 'none',
          fontFamily: 'var(--font-ui)',
          fontSize: 13.5,
          fontWeight: 700,
        }}
      >
        {CREWS_COPY.net.retry}
      </button>
    </div>
  )
}
