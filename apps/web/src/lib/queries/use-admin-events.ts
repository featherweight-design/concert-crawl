'use client'

import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'

export function useApproveEvent() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.patch(`/v1/admin/events/${id}/verify`, token, {})
    },
  })
}

export function useRejectEvent() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.delete(`/v1/admin/events/${id}`, token)
    },
  })
}
