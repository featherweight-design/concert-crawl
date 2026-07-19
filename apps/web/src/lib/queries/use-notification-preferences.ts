'use client'

// #1063 NotificationsSection query — reads /v1/me/notification-preferences
// (side-effect-free GET; returns defaults when no row exists) and provides a
// mutation that PATCHes partial flags.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'

export interface NotificationPreferences {
  masterEnabled: boolean
  watchUpdatesEnabled: boolean
  priceDropsEnabled: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  masterEnabled: false,
  watchUpdatesEnabled: true,
  priceDropsEnabled: true,
}

// Scoped by userId — the app-level QueryClient outlives sign-in sessions, so
// an account switch must not surface the previous user's cached preferences
// (same reasoning as planStateQueryKey / spotifyConnectionQueryKey).
export const notificationPreferencesQueryKey = (
  userId: string | null | undefined,
) => ['notification-preferences', userId ?? null] as const

export function useNotificationPreferences() {
  const { getToken, isSignedIn, userId } = useAuth()

  return useQuery({
    queryKey: notificationPreferencesQueryKey(userId),
    queryFn: async (): Promise<NotificationPreferences> => {
      const token = await getToken()
      if (!token) {
        throw new Error('Auth token unavailable while fetching preferences')
      }
      const response = await apiClient.get<NotificationPreferences>(
        '/v1/me/notification-preferences',
        token,
      )
      return response ?? DEFAULT_PREFERENCES
    },
    enabled: !!isSignedIn,
    staleTime: 60 * 1000,
  })
}

export function usePatchNotificationPreferences() {
  const queryClient = useQueryClient()
  const { getToken, userId } = useAuth()

  return useMutation({
    mutationFn: async (
      updates: Partial<NotificationPreferences>,
    ): Promise<NotificationPreferences> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const response = await apiClient.patch<NotificationPreferences>(
        '/v1/me/notification-preferences',
        token,
        updates,
      )
      return response ?? DEFAULT_PREFERENCES
    },
    onSuccess: (next) => {
      queryClient.setQueryData(notificationPreferencesQueryKey(userId), next)
    },
  })
}
