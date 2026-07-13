'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { FounderWindowView } from '@concert-crawl/types'
import { track } from '@/lib/analytics'
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

  // Funnel event (spec §8): the founder window state was surfaced. Fires once
  // per enable cycle — not on every 10s poll — and re-arms when the surface
  // that enabled it (picker / takeover) is dismissed and reopened.
  const firedRef = useRef(false)
  const windowState = query.data?.state
  useEffect(() => {
    if (!enabled) {
      firedRef.current = false
      return
    }
    if (windowState !== undefined && !firedRef.current) {
      firedRef.current = true
      track('founder_window_view', { state: windowState })
    }
  }, [enabled, windowState])

  return query
}
