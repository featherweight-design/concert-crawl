'use client'

// One-tap Resubscribe for the cancel-grace plan card (PR 4.5 / #780
// README decision #3): flips auto-renew back on via POST
// /v1/billing/resubscribe — no checkout trip. A 409 means the grace window
// already lapsed under us; the plan-state invalidation re-renders the
// correct card either way.

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { resubscribeSubscription } from '@/lib/billing'
import { planStateQueryKey } from '@/lib/queries/use-plan-state'
import { ApiError } from '@/lib/api'
import { PLAN_CARD_COPY } from '../definitions/copy'

interface Resubscribe {
  resubscribe: () => void
  resubscribePending: boolean
  resubscribeError: string | null
  clearResubscribeError: () => void
}

export const useResubscribe = (): Resubscribe => {
  const { getToken, userId } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [resubscribePending, setResubscribePending] = useState(false)
  const [resubscribeError, setResubscribeError] = useState<string | null>(null)

  const resubscribe = useCallback(() => {
    void (async () => {
      setResubscribePending(true)
      setResubscribeError(null)
      try {
        const token = await getToken()
        if (!token) throw new Error('Auth token unavailable')
        await resubscribeSubscription(token)
        await queryClient.invalidateQueries({
          queryKey: planStateQueryKey(userId),
        })
        router.refresh()
      } catch (err) {
        console.error('plan-panel: resubscribe failed', err)
        if (err instanceof ApiError && err.status === 409) {
          // Stale card — the subscription left cancel-grace. Re-sync so the
          // card re-resolves rather than leaving a dead CTA.
          await queryClient.invalidateQueries({
            queryKey: planStateQueryKey(userId),
          })
          router.refresh()
        }
        setResubscribeError(PLAN_CARD_COPY.errors.resubscribe)
      } finally {
        setResubscribePending(false)
      }
    })()
  }, [getToken, queryClient, router, userId])

  const clearResubscribeError = useCallback(() => setResubscribeError(null), [])

  return {
    resubscribe,
    resubscribePending,
    resubscribeError,
    clearResubscribeError,
  }
}
