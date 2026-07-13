'use client'

import { useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { initAnalytics, identifyUser, resetAnalyticsIdentity } from './client'

interface PostHogProviderProps {
  children: React.ReactNode
}

// Initializes posthog-js once on mount (no-op without a key) and keeps the
// analytics identity in lockstep with the Clerk session: identify on sign-in,
// reset on sign-out. Renders children unchanged.
export function PostHogProvider({ children }: PostHogProviderProps) {
  const { isLoaded, userId } = useAuth()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (userId) {
      identifyUser(userId)
    } else {
      resetAnalyticsIdentity()
    }
  }, [isLoaded, userId])

  return <>{children}</>
}
