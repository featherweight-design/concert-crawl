'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { initAnalytics, identifyUser, resetAnalyticsIdentity } from './client'

interface PostHogProviderProps {
  children: React.ReactNode
}

// Starts posthog-js once Clerk knows who is reading (no-op without a key) and
// keeps the analytics identity in lockstep with the Clerk session: identify on
// sign-in (with the display name as the person's `name`, never the email),
// reset on sign-out. Init and the identity call run in the same effect, so the
// identity is settled before posthog-js's first pageview, which it defers by a
// timer; starting before Clerk loads would credit a browser's first pageview
// and clicks to whoever it last identified. Renders children unchanged.
export function PostHogProvider({ children }: PostHogProviderProps) {
  const { isLoaded, user } = useUser()
  const userId = user?.id ?? null
  const name = user?.fullName ?? user?.username ?? null

  useEffect(() => {
    if (!isLoaded) return
    initAnalytics()
    if (userId) {
      identifyUser(userId, name)
    } else {
      resetAnalyticsIdentity()
    }
  }, [isLoaded, userId, name])

  return <>{children}</>
}
