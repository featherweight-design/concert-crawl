'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] page error:', error)
  }, [error])

  return (
    <div className="flex flex-col gap-3 p-6">
      <h2 className="text-lg font-semibold text-destructive">
        Something went wrong
      </h2>
      <p className="text-sm text-muted-foreground">
        If you were trying to access a restricted page, try signing out and back
        in to refresh your session. Otherwise, reload and try again.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          Error ID: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="w-fit rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
      >
        Try again
      </button>
    </div>
  )
}
