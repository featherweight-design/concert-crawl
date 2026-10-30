'use client'

import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '@/lib/users'
import {
  initAnalytics,
  identifyUser,
  isAnalyticsEnabled,
  resetAnalyticsIdentity,
  setPersonName,
} from './client'

interface PostHogProviderProps {
  children: React.ReactNode
}

// Scoped by userId so an account switch never reads the previous reader's
// handle from the app-level QueryClient.
export const analyticsHandleQueryKey = (userId: string | null) =>
  ['analytics-handle', userId] as const

// Starts posthog-js once Clerk knows who is reading (no-op without a key) and
// keeps the analytics identity in lockstep with the Clerk session: identify on
// sign-in, reset on sign-out. Init and the identity call run in the same
// effect, so the identity is settled before posthog-js's first pageview, which
// it defers by a timer; starting before Clerk loads would credit a browser's
// first pageview and clicks to whoever it last identified.
//
// The person's `name` is their display name: the profile handle, the name
// this app shows other readers (GET /v1/users/me). Never the email, and not
// Clerk's full name or username, which the app does not display. A reader
// with no handle has the property removed. The handle is only fetched while
// analytics is actually running. Renders children unchanged.
export function PostHogProvider({ children }: PostHogProviderProps) {
  const { isLoaded, user } = useUser()
  const { getToken } = useAuth()
  const userId = user?.id ?? null
  const [analyticsOn, setAnalyticsOn] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    initAnalytics()
    setAnalyticsOn(isAnalyticsEnabled())
    if (userId) {
      identifyUser(userId)
    } else {
      resetAnalyticsIdentity()
    }
  }, [isLoaded, userId])

  const { data: handle, isSuccess } = useQuery<string | null>({
    queryKey: analyticsHandleQueryKey(userId),
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Auth token unavailable for analytics')
      const profile = await fetchMe(token)
      return profile.handle
    },
    enabled: analyticsOn && userId !== null,
    staleTime: 5 * 60 * 1000,
    // A missing name is not worth a retry storm; the next mount tries again.
    retry: false,
  })

  useEffect(() => {
    if (userId && isSuccess) setPersonName(handle ?? null)
  }, [userId, isSuccess, handle])

  return <>{children}</>
}
