'use client'

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  markPanelSeen,
  type ConsumerNotification,
  type NotificationListResult,
} from '@/lib/notifications'

// Scoped by userId for the same reason as watchingQueryKey: the app-level
// QueryClient outlives a sign-in session, and an unscoped key would briefly
// serve the previous account's notifications after an account switch.
export const notificationsQueryKey = (userId: string | null | undefined) =>
  ['notifications', userId ?? null] as const

type NotificationPages = InfiniteData<NotificationListResult, string | null>

/**
 * The panel's read path.
 *
 * ⚠ NO SERVER PREFETCH, NO `initialData`, NO `placeholderData`. The loading
 * state is a designed, reachable state (LOAD-01..12) and seeding the cache
 * would make `isPending` false on first render, deleting it from the product.
 * If a future PR wants a prefetch, it has to delete the skeleton first.
 */
export function useNotifications() {
  const { getToken, isSignedIn, userId } = useAuth()

  return useInfiniteQuery({
    queryKey: notificationsQueryKey(userId),
    queryFn: async ({ pageParam }): Promise<NotificationListResult> => {
      const token = await getToken()
      if (!token) {
        // Throw rather than resolve empty: a successful empty page would cache
        // as fresh and show "All quiet." for minutes after a token blip.
        throw new Error('Auth token unavailable while fetching notifications')
      }
      return fetchNotifications(token, pageParam ?? undefined)
    },
    // The cursor is opaque — echoed back verbatim, never parsed or built.
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!isSignedIn && !!userId,
    // Notifications are the one surface where staleness is the whole failure
    // mode, so it polls; 60s is well inside the crawl cadence that writes them.
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/** Flattens the pages the panel actually renders. */
export const flattenNotifications = (
  data: NotificationPages | undefined,
): ConsumerNotification[] => data?.pages.flatMap((page) => page.items) ?? []

/**
 * The header's count. Comes from the FIRST page because the API's
 * `unreadCount` spans the whole backfill window, not the loaded page — later
 * pages repeat the same number, and reading page 0 avoids depending on how far
 * someone has scrolled.
 */
export const unreadCountOf = (data: NotificationPages | undefined): number =>
  data?.pages[0]?.unreadCount ?? 0

/**
 * The panel's last-opened watermark.
 *
 * `null` means NOTHING HAS BEEN SEEN YET — the majority case at launch, since
 * no account has ever opened this panel. It does not mean "everything is
 * backfill", and callers must not treat it as a zero timestamp.
 */
export const seenAtOf = (data: NotificationPages | undefined): string | null =>
  data?.pages[0]?.seenAt ?? null

/** Applies a read stamp to matching rows across every loaded page. */
const stampRead = (
  data: NotificationPages,
  readAt: string,
  matches: (item: ConsumerNotification) => boolean,
): NotificationPages => ({
  ...data,
  pages: data.pages.map((page) => {
    const items = page.items.map((item) =>
      item.readAt === null && matches(item) ? { ...item, readAt } : item,
    )
    const marked = page.items.filter(
      (item) => item.readAt === null && matches(item),
    ).length
    return {
      ...page,
      items,
      unreadCount: Math.max(0, page.unreadCount - marked),
    }
  }),
})

/**
 * Optimistic read mutations.
 *
 * Both roll the cache back on failure and refetch on settle, because the
 * server number is window-wide while the optimistic decrement can only see
 * loaded pages — the two only reconcile from the server.
 */
export function useNotificationMutations() {
  const { getToken, userId } = useAuth()
  const queryClient = useQueryClient()
  const key = notificationsQueryKey(userId)

  const snapshot = async (): Promise<{ previous?: NotificationPages }> => {
    await queryClient.cancelQueries({ queryKey: key })
    const previous = queryClient.getQueryData<NotificationPages>(key)
    return previous === undefined ? {} : { previous }
  }

  const rollback = (context: { previous?: NotificationPages } | undefined) => {
    if (context?.previous !== undefined) {
      queryClient.setQueryData(key, context.previous)
    }
  }

  const settle = () => {
    void queryClient.invalidateQueries({ queryKey: key })
  }

  const markRead = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const token = await getToken()
      if (!token) throw new Error('Auth token unavailable while marking read')
      await markNotificationRead(token, id)
    },
    onMutate: async (id: string) => {
      const context = await snapshot()
      if (context.previous !== undefined) {
        const now = new Date().toISOString()
        queryClient.setQueryData(
          key,
          stampRead(context.previous, now, (item) => item.id === id),
        )
      }
      return context
    },
    onError: (_err, _id, context) => rollback(context),
    onSettled: settle,
  })

  const markAllRead = useMutation({
    mutationFn: async (): Promise<number> => {
      const token = await getToken()
      if (!token) throw new Error('Auth token unavailable while marking all')
      return markAllNotificationsRead(token)
    },
    onMutate: async () => {
      const context = await snapshot()
      if (context.previous !== undefined) {
        const now = new Date().toISOString()
        queryClient.setQueryData(
          key,
          stampRead(context.previous, now, () => true),
        )
      }
      return context
    },
    onError: (_err, _vars, context) => rollback(context),
    onSettled: settle,
  })

  // Not optimistic: the watermark is invisible in the panel body (it feeds the
  // chrome's pip), so an optimistic write would buy nothing and could clear a
  // pip that a failed request left standing.
  const markSeen = useMutation({
    mutationFn: async (): Promise<string | null> => {
      const token = await getToken()
      if (!token) throw new Error('Auth token unavailable while marking seen')
      return markPanelSeen(token)
    },
    onSettled: settle,
  })

  return { markRead, markAllRead, markSeen }
}
