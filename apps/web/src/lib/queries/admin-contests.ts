'use client'

// React Query hooks for the admin contest-review surfaces.
//
// **STATUS — Task 13 stub.** The real fetch + apiClient call lands in
// Task 16 (`React Query hooks (useReviewContestsQuery, detail, resolve,
// defer)`). For now, the list hook returns an empty page so the
// `ContestsTabContent` tab body can mount without wiring the network
// layer. The shape of `ReviewContestsResult` matches the API response
// at GET /v1/admin/contests/prices (apps/api/src/routes/admin/contests.ts
// line ~133), so Task 16's `queryFn` swap is a localized change.

import { useQuery } from '@tanstack/react-query'
import { type PriceContestRow } from '@/components/admin/review/PriceDisputesQueue'

export interface ReviewContestsResult {
  items: PriceContestRow[]
  total: number
  limit: number
  offset: number
}

const EMPTY_RESULT: ReviewContestsResult = {
  items: [],
  total: 0,
  limit: 20,
  offset: 0,
}

// Stable query key. Task 16 will likely extend this with pagination
// parameters once the hook accepts them.
export const adminContestsQueryKeys = {
  list: ['admin', 'contests', 'list'] as const,
}

export const useReviewContestsQuery = () =>
  useQuery({
    queryKey: adminContestsQueryKeys.list,
    queryFn: async (): Promise<ReviewContestsResult> => {
      // Task 16 swap-target: replace with `apiClient.get(...)` once the
      // auth wiring (useAuth + getToken) is hooked up here. Returning
      // empty data keeps the queue auto-hiding (it returns null) and the
      // tab body renders harmlessly.
      return EMPTY_RESULT
    },
  })
