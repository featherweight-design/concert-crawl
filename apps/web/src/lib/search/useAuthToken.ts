'use client'

import { useAuth } from '@clerk/nextjs'

export function useAuthToken(): () => Promise<string | null> {
  const { getToken } = useAuth()
  return getToken
}
