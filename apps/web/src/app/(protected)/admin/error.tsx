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

  const isForbidden =
    error.name === 'ApiError' &&
    error.message.toLowerCase().includes('forbidden')

  return (
    <div className="flex flex-col gap-3 p-6">
      <h2 className="text-lg font-semibold text-destructive">
        {isForbidden ? 'Access denied' : 'Something went wrong'}
      </h2>
      <p className="text-sm text-muted-foreground">
        {isForbidden
          ? 'Your session does not have the required permissions. Try signing out and back in.'
          : error.message}
      </p>
      <button
        onClick={reset}
        className="w-fit rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
      >
        Try again
      </button>
    </div>
  )
}
