'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'
import type { AdminEvent } from '@/components/admin/events/types'

export const adminEventsQueryKey = ['admin', 'events'] as const

export function useAdminEvents(initialData: AdminEvent[]) {
  const { getToken } = useAuth()
  return useQuery({
    queryKey: adminEventsQueryKey,
    queryFn: async (): Promise<AdminEvent[]> => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return apiClient.get<AdminEvent[]>(
        '/v1/admin/events?verified=false&limit=500',
        token,
      )
    },
    initialData,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

export function useApproveEvent() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.patch(`/v1/admin/events/${id}/verify`, token, {})
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminEventsQueryKey })
    },
  })
}

export function useRejectEvent() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.delete(`/v1/admin/events/${id}`, token)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminEventsQueryKey })
    },
  })
}

interface EventUpdatePayload {
  title?: string
  artist?: string
  date?: string
  doorsTime?: string | null
  showTime?: string | null
  ticketPriceMin?: string | null
  ticketPriceMax?: string | null
  genre?: string[] | null
}

export function useUpdateEvent() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: EventUpdatePayload
    }) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.patch(`/v1/admin/events/${id}`, token, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminEventsQueryKey })
    },
  })
}
