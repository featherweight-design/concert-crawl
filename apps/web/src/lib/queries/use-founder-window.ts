'use client'

import { useQuery } from '@tanstack/react-query'
import type { FounderWindowView } from '@concert-crawl/types'
import { fetchFounderWindow } from '@/lib/billing'

export const founderWindowQueryKey = ['founder-window'] as const

// The API caches the payload in-process for 10s (eng infra spec Part 2
// §1.4); polling at that same interval keeps the scarcity rail fresh
// without asking harder than the server will answer. Only enabled while
// the picker is open, so the poll is short-lived.
export function useFounderWindow(enabled = true) {
  const query = useQuery<FounderWindowView>({
    queryKey: founderWindowQueryKey,
    queryFn: fetchFounderWindow,
    staleTime: 10_000,
    refetchInterval: 10_000,
    enabled,
  })

  return query
}
