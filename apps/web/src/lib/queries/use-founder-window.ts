'use client'

import { useQuery } from '@tanstack/react-query'
import type { FounderWindowView } from '@concert-crawl/types'
import { fetchFounderWindow } from '@/lib/billing'

export const founderWindowQueryKey = ['founder-window'] as const

// The API caches the payload in-process for 10s (eng infra spec Part 2
// §1.4); matching staleTime keeps the scarcity rail fresh without polling
// harder than the server will answer.
export function useFounderWindow(enabled = true) {
  return useQuery<FounderWindowView>({
    queryKey: founderWindowQueryKey,
    queryFn: fetchFounderWindow,
    staleTime: 10_000,
    refetchInterval: 60_000,
    enabled,
  })
}
