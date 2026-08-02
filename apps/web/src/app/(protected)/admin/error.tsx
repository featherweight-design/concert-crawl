'use client'

import { useEffect } from 'react'
import { useErrorBoundaryRetry } from '@/lib/hooks/useErrorBoundaryRetry'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const retry = useErrorBoundaryRetry(reset)

  useEffect(() => {
    console.error('[admin] page error:', error)
  }, [error])

  return (
    <div className="flex flex-col gap-3 p-6">
      <h2 className="text-lg font-semibold text-danger">
        Something went wrong
      </h2>
      <p className="text-sm text-fg-muted">
        If you were trying to access a restricted page, try signing out and back
        in to refresh your session. Otherwise, reload and try again.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="rounded bg-surface-1 p-3 text-xs text-danger overflow-auto max-h-48">
          {error.message}
          {'\n\n'}
          {error.stack}
        </pre>
      )}
      {error.digest && (
        <p className="font-mono text-xs text-fg-muted">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={retry}
        className="w-fit rounded-md bg-accent px-3 py-1.5 text-sm text-fg-on-accent"
      >
        Try again
      </button>
    </div>
  )
}
