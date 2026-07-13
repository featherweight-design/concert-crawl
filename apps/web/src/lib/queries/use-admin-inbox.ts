'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import type {
  InboxItem,
  InboxItemType,
  InboxResponse,
} from '@concert-crawl/types'

// Read/unread status filter — mirrors the API's `status` query param. Defaults
// to 'unread' so the inbox opens on what still needs action.
export type InboxStatusFilter = 'unread' | 'read' | 'all'
// 'all' is a UI-only sentinel meaning "no category filter" — it's omitted from
// the request rather than sent as a param.
export type InboxCategoryFilter = InboxItemType | 'all'

export const INBOX_PAGE_SIZE = 25

export interface InboxQueryInput {
  category: InboxCategoryFilter
  status: InboxStatusFilter
  page: number
  pageSize: number
}

// Page-replacement model (mirrors use-admin-review): the API paginates server
// side, so each query key holds just the current page's rows plus the server
// `total` and full-inbox `unreadCounts`. The key includes every filter + the
// page/size so flipping filters or pages moves to a fresh cache slot.
export const inboxQueryKeys = {
  root: ['admin', 'inbox'] as const,
  list: (input: InboxQueryInput) =>
    [
      'admin',
      'inbox',
      'list',
      input.category,
      input.status,
      input.page,
      input.pageSize,
    ] as const,
}

function buildInboxPath(input: InboxQueryInput): string {
  const params = new URLSearchParams()
  if (input.category !== 'all') params.set('category', input.category)
  params.set('status', input.status)
  params.set('count', 'true')
  params.set('limit', String(input.pageSize))
  params.set('offset', String((input.page - 1) * input.pageSize))
  return `/v1/admin/inbox?${params.toString()}`
}

export function useAdminInbox(
  input: InboxQueryInput,
  initialData?: InboxResponse,
) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: inboxQueryKeys.list(input),
    queryFn: async (): Promise<InboxResponse> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.get<InboxResponse>(buildInboxPath(input), token)
    },
    // Hold the previous page/filter's data while the next loads so the table
    // doesn't flash empty on pagination or filter changes.
    placeholderData: (prev) => prev,
    ...(initialData ? { initialData } : {}),
  })
}

// ───── Mutations ─────────────────────────────────────────────────────────────
// Both invalidate the whole inbox subtree: read state changes shift rows
// between the unread/read views and move the per-category unread badges, so a
// surface-wide invalidation is simpler and correct than surgical cache edits.

export function useMarkInboxRead() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (
      item: Pick<InboxItem, 'itemType' | 'itemId' | 'sourceCreatedAt'>,
    ) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.post('/v1/admin/inbox/read', token, {
        itemType: item.itemType,
        itemId: item.itemId,
        sourceCreatedAt: item.sourceCreatedAt,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inboxQueryKeys.root })
    },
  })
}

export function useMarkAllInboxRead() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    // `category` omitted (undefined) marks every category read.
    mutationFn: async (category?: InboxItemType) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.post(
        '/v1/admin/inbox/read-all',
        token,
        category ? { category } : {},
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inboxQueryKeys.root })
    },
  })
}
