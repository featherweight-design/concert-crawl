'use client'

// Live "$X.XX" proration numbers for the Downgrade/Upgrade confirm surfaces
// (GET /v1/billing/proration-preview). Keyed per user + target tier;
// enabled only while the matching surface is showing.

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import type { ProrationPreview, SwitchableTier } from '@/lib/billing'
import { fetchProrationPreview } from '@/lib/billing'

export const prorationPreviewQueryKey = (
  userId: string | null | undefined,
  tier: SwitchableTier,
) => ['proration-preview', userId ?? null, tier] as const

export const useProrationPreview = (tier: SwitchableTier, enabled: boolean) => {
  const { getToken, userId } = useAuth()

  return useQuery<ProrationPreview>({
    queryKey: prorationPreviewQueryKey(userId, tier),
    queryFn: async () => {
      const token = await getToken()
      if (!token) {
        throw new Error(
          'Auth token unavailable while fetching proration preview',
        )
      }
      return fetchProrationPreview(token, tier)
    },
    enabled,
    // Proration drifts by the second on Stripe's side; a short window keeps
    // the surface stable without re-fetching on every open/close.
    staleTime: 60 * 1000,
  })
}
