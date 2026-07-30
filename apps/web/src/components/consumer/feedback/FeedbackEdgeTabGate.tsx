'use client'

import { useAuth } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { FeedbackEdgeTab } from './FeedbackEdgeTab'

export function FeedbackEdgeTabGate() {
  const pathname = usePathname()
  const { isLoaded, isSignedIn } = useAuth()
  // Feedback posts to an authed endpoint, so an anonymous visitor would only
  // get a 401 out of it. Waiting for isLoaded keeps the tab from flashing in
  // before Clerk resolves.
  if (!isLoaded || !isSignedIn) return null
  if (pathname.startsWith('/admin')) return null
  return <FeedbackEdgeTab />
}
