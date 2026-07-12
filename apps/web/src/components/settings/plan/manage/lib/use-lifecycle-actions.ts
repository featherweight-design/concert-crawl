'use client'

// Cancel + change-tier mutations for the #780 lifecycle flows. On success:
// invalidate the plan-state query (same key the entitlement gate reads),
// refresh the server tree (plan card is server-derived), then hand control
// back to the caller (close the surface). Failures stay on the surface as
// an ErrorLine — the design defines no error states, so this follows the
// tier-picker convention.

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { SwitchableTier } from '@/lib/billing'
import { cancelSubscription, changeSubscriptionTier } from '@/lib/billing'
import { planStateQueryKey } from '@/lib/queries/use-plan-state'
import { MANAGE_ERRORS_COPY } from '../definitions/copy'

interface LifecycleActions {
  cancel: (onDone: () => void) => void
  changeTier: (tier: SwitchableTier, onDone: () => void) => void
  pending: boolean
  errorText: string | null
  clearError: () => void
}

export const useLifecycleActions = (): LifecycleActions => {
  const { getToken, userId } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const run = useCallback(
    (
      mutate: (token: string) => Promise<void>,
      failureCopy: string,
      logLabel: string,
      onDone: () => void,
    ) => {
      void (async () => {
        setPending(true)
        setErrorText(null)
        try {
          const token = await getToken()
          if (!token) throw new Error('Auth token unavailable')
          await mutate(token)
          await queryClient.invalidateQueries({
            queryKey: planStateQueryKey(userId),
          })
          router.refresh()
          onDone()
        } catch (err) {
          console.error(`manage-sheet: ${logLabel} failed`, err)
          setErrorText(failureCopy)
        } finally {
          setPending(false)
        }
      })()
    },
    [getToken, queryClient, router, userId],
  )

  const cancel = useCallback(
    (onDone: () => void) => {
      run(
        (token) => cancelSubscription(token),
        MANAGE_ERRORS_COPY.cancel,
        'cancel',
        onDone,
      )
    },
    [run],
  )

  const changeTier = useCallback(
    (tier: SwitchableTier, onDone: () => void) => {
      run(
        (token) => changeSubscriptionTier(token, tier),
        MANAGE_ERRORS_COPY.changeTier,
        'change-tier',
        onDone,
      )
    },
    [run],
  )

  const clearError = useCallback(() => setErrorText(null), [])

  return { cancel, changeTier, pending, errorText, clearError }
}
