'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Builds the retry handler for an App Router `error.tsx` boundary.
 *
 * Next's `reset()` only re-renders the error boundary's subtree — it does not
 * invalidate the Router Cache, so a boundary tripped by a failed Server
 * Component fetch re-renders against the *same cached (failed) RSC payload*
 * and lands straight back on the error UI. Observed as "Try again" firing zero
 * network requests and never recovering even once the upstream had healed,
 * while a hard reload recovered immediately.
 *
 * `router.refresh()` is what actually refetches the RSC payload, so the retry
 * has to do both: refresh to invalidate + refetch the server data, then reset
 * to drop the boundary's error state and re-render with the fresh payload.
 *
 * Shared because every `error.tsx` in the app needs the identical pairing —
 * a boundary that calls bare `reset()` is silently broken.
 */
export const useErrorBoundaryRetry = (reset: () => void): (() => void) => {
  const router = useRouter()

  return useCallback(() => {
    // Order matters: invalidate the cached RSC payload first so the re-render
    // triggered by reset() renders against fresh server data.
    router.refresh()
    reset()
  }, [router, reset])
}
