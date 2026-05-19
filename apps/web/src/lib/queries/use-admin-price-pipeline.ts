'use client'

import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { apiClient } from '@/lib/api'

export function useTriggerPricePipeline() {
  const { getToken } = useAuth()
  return useMutation({
    mutationFn: async (eventId: string) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await apiClient.post(`/v1/admin/prices/pipeline/${eventId}`, token, {})
    },
  })
}
