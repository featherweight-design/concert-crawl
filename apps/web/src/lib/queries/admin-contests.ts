'use client'

// React Query hooks for the admin contest-review surfaces.
//
// Mirrors the canonical hook pattern in `use-admin-review.ts`:
//   - `useAuth().getToken()` resolves the Clerk JWT before every fetch.
//   - `apiClient.get/post` unwraps the {success, data} envelope and returns
//     `data` directly (see apps/web/src/lib/api.ts — the path/token/body
//     ordering is `apiClient.post(path, token, data)`, NOT path/body/token).
//   - Query keys are namespaced under `adminContestsKeys.all` so the
//     resolve/defer mutations can blow the whole subtree (list + detail)
//     in one `invalidateQueries` call. Counts pill is invalidated via
//     `reviewQueryKeys.counts` so the Contests tab badge refreshes.
//
// Response types (PriceContestRow, ContestDetailData) are defined here —
// not in the consuming components — to keep the dependency direction
// one-way: hooks own the API contract, components import the type. This
// prevents circular imports if a component module ever needs to reach
// back into the query layer (e.g. AdminDisputePanel mounting under
// PriceDisputesQueue).

import { useAuth } from '@clerk/nextjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SourceCategory, Tier, Vendor } from '@concert-crawl/types'
import { apiClient } from '@/lib/api'
import { reviewQueryKeys } from './use-admin-review'

// ───── Query keys ────────────────────────────────────────────────────────────

export const adminContestsKeys = {
  all: ['admin-contests'] as const,
  list: (params?: ReviewContestsParams) =>
    params === undefined
      ? ([...adminContestsKeys.all, 'list'] as const)
      : ([...adminContestsKeys.all, 'list', params] as const),
  detail: (contestId: string) =>
    [...adminContestsKeys.all, 'detail', contestId] as const,
}

// Sort values mirror the API's `sort` query enum (see
// apps/api/src/routes/admin/contests.ts listQuerySchema). filed-at-asc is
// the server default and stays the UI default (#758).
export type ContestSortOrder = 'filed-at-asc' | 'filed-at-desc'

export interface ReviewContestsParams {
  limit?: number
  offset?: number
  sort?: ContestSortOrder
  // Widens the list from open contests (pending counters only) to all
  // contest history — the "All disputes" toggle (#758).
  includeArchived?: boolean
}

// ───── Response types — match the wire shape exactly ─────────────────────────

// Per-row payload returned by GET /v1/admin/contests/prices (see
// apps/api/src/routes/admin/contests.ts line ~133). Price-min/max stay as
// strings because they're Postgres `decimal` columns — parsing happens at
// the display layer so cents survive the round trip.
//
// Defined here (not in PriceDisputesQueue) so the dependency direction stays
// one-way: hooks own the API contract, components import the type. Same
// rationale as ContestDetailData below.
export interface PriceContestRow {
  contestId: string
  eventId: string
  eventTitle: string
  venueName: string
  eventDate: string
  tier: Tier
  sourceCategory: SourceCategory | null
  parent: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    submitter: { userId: string | null; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    lastUpdatedAt: string
    note: string | null
  }
  counter: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    submitter: { userId: string | null; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    note: string | null
    // Counter row status — 'pending' on every open contest (the default
    // list scope filters on it); other values surface only when the
    // "All disputes" scope widens the query (#758). Drives the counter
    // cell's status badge.
    status: 'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived'
  }
  filedAt: string
}

// GET /v1/admin/contests/prices response shape — see
// apps/api/src/routes/admin/contests.ts (`items` projection ~line 133, list
// `{ items, total, limit, offset }` envelope ~line 197).
export interface ReviewContestsResult {
  items: PriceContestRow[]
  total: number
  limit: number
  offset: number
}

// GET /v1/admin/contests/prices/:contestId response shape — see
// apps/api/src/routes/admin/contests.ts ~line 313. Mirrors a single row from
// the list endpoint plus parent/counter `status`, the counter's
// `lastAdminAction*` engagement-signal fields (set by defer), and an empty
// `history: []` placeholder (spec §6.2 — history pane is follow-up scope).
//
// Decimal price columns arrive as strings (Postgres numeric → JSON string);
// parse at the display layer. Same convention as PriceContestRow.
export interface ContestDetailData {
  contestId: string
  eventId: string
  eventTitle: string
  venueName: string
  eventDate: string
  tier: Tier
  sourceCategory: SourceCategory | null
  parent: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    submitter: { userId: string | null; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    lastUpdatedAt: string
    note: string | null
    status: 'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived'
    // Archive rationale captured at resolution time. Re-surfaced in the
    // panel's read-only banner so admins re-visiting a resolved contest can
    // see WHY a side was archived (spec §4 line 245 — "reason shown to both
    // submitters"). Stays null on actionable / pending contests.
    archivedReason: string | null
  }
  counter: {
    id: string
    priceMin: string
    priceMax: string | null
    vendor: Vendor
    submitter: { userId: string | null; handle: string | null }
    confirms: { fans: number; admin: number }
    observedAt: string
    note: string | null
    status: 'pending' | 'corroborated' | 'disputed' | 'stale' | 'archived'
    lastAdminActionAt: string | null
    lastAdminActionKind: 'defer' | null
    // Same rationale as parent.archivedReason — captures the admin's reason
    // when the counter loses a resolution.
    archivedReason: string | null
  }
  filedAt: string
  // Empty placeholder per spec §6.2 — the history pane is follow-up scope.
  // Kept on the type so AdminDisputePanel (Task 15) can read it without a
  // refactor when history rows start landing.
  history: ReadonlyArray<unknown>
}

// POST /v1/admin/contests/prices/:contestId/resolve — request body matches
// the resolveBodySchema in apps/api/src/routes/admin/contests.ts (~line 376).
// `resolution` is the API's canonical discriminator, NOT `decision`.
export interface ResolveContestInput {
  contestId: string
  resolution: 'parent_wins' | 'challenger_wins'
  reason: string
}

// POST /v1/admin/contests/prices/:contestId/defer — request body matches the
// deferBodySchema in apps/api/src/routes/admin/contests.ts (~line 760).
export interface DeferContestInput {
  contestId: string
  reason: string
}

// ───── Queries ───────────────────────────────────────────────────────────────

// List: open price contests (counter status='pending' AND
// disputedSubmissionId IS NOT NULL — see API list-endpoint comment for why
// the query pivots on the counter row, not the parent's status). Optional
// params thread pagination (#759) and sort / all-history scope (#758)
// through to the API; omitted params fall back to the server defaults
// (limit=20, offset=0, filed-at-asc, open contests only).
export const useReviewContestsQuery = (params?: ReviewContestsParams) => {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: adminContestsKeys.list(params),
    queryFn: async (): Promise<ReviewContestsResult> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const search = new URLSearchParams()
      if (params?.limit !== undefined) search.set('limit', String(params.limit))
      if (params?.offset !== undefined) {
        search.set('offset', String(params.offset))
      }
      if (params?.sort !== undefined) search.set('sort', params.sort)
      if (params?.includeArchived) search.set('includeArchived', 'true')
      const query = search.toString()
      return apiClient.get<ReviewContestsResult>(
        query
          ? `/v1/admin/contests/prices?${query}`
          : '/v1/admin/contests/prices',
        token,
      )
    },
  })
}

// Detail: a single contest by parent submission id. Surfaces parent +
// counter statuses + counter's lastAdminAction* fields so AdminDisputePanel
// (Task 15) can render read-only banners for already-resolved or deferred
// contests off the actual row state.
export const useReviewContestDetail = (contestId: string) => {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: adminContestsKeys.detail(contestId),
    queryFn: async (): Promise<ContestDetailData> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.get<ContestDetailData>(
        `/v1/admin/contests/prices/${contestId}`,
        token,
      )
    },
  })
}

// ───── Mutations ─────────────────────────────────────────────────────────────

// Resolve: atomic parent_wins / challenger_wins commit. Server returns
// `{ resolution, parent, challenger, eventPriceUpdated }` on success; we
// surface that to the caller via the mutation's `data` field but the panel
// triggers its post-resolve navigation off `onSuccess` rather than the body.
//
// Invalidation cascade:
//   - `adminContestsKeys.all` — blows BOTH the list (contest leaves the
//     queue) and any cached detail (status flipped to resolved). The detail
//     query the panel just read is the one being invalidated; the panel
//     unmounts after resolve so there's no refetch storm.
//   - `reviewQueryKeys.counts` — Contests tab pill rebinds from
//     `priceContests`, which the API computes from the same WHERE clause as
//     the list endpoint. Refetching keeps the badge in sync.
export const useResolveContest = () => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ResolveContestInput) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.post<unknown>(
        `/v1/admin/contests/prices/${input.contestId}/resolve`,
        token,
        { resolution: input.resolution, reason: input.reason },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminContestsKeys.all })
      void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.counts })
    },
  })
}

// Defer: "Need more info" engagement signal. Server flips
// counter.lastAdminActionKind/At only; statuses untouched. Returns
// `{ contestId, deferredAt, deferReason }`.
//
// Invalidation cascade is the same as resolve: defer doesn't remove the
// contest from the queue (counter stays pending), but the panel reads the
// detail again to surface the freshly-set "Admin requested more info" pill
// on the counter card, and the counts pill stays consistent with the list.
export const useDeferContest = () => {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeferContestInput) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.post<unknown>(
        `/v1/admin/contests/prices/${input.contestId}/defer`,
        token,
        { reason: input.reason },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminContestsKeys.all })
      void queryClient.invalidateQueries({ queryKey: reviewQueryKeys.counts })
    },
  })
}
