'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { initAnalytics, identifyUser, resetAnalyticsIdentity } from './client'

interface PostHogProviderProps {
  children: React.ReactNode
}

// Initializes posthog-js once on mount (no-op without a key) and keeps the
// analytics identity in lockstep with the Clerk session: identify on sign-in
// (with the display name as the person's `name`, never the email), reset on
// sign-out. Renders children unchanged.
export function PostHogProvider({ children }: PostHogProviderProps) {
  const { isLoaded, user } = useUser()
  const userId = user?.id ?? null
  const name = user?.fullName ?? user?.username ?? null

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (userId) {
      identifyUser(userId, name)
    } else {
      resetAnalyticsIdentity()
    }
  }, [isLoaded, userId, name])

  return <>{children}</>
}
