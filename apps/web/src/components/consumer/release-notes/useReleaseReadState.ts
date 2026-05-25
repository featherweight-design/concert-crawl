'use client'

import { useState, useEffect, useCallback } from 'react'

const LAST_SEEN_KEY = 'cc.lastSeenRelease'
const DISMISSED_KEY = 'cc.dismissedSpotlights'

export function useReleaseReadState(latestVersion: string) {
  const [unread, setUnread] = useState(false)
  // Initialize to true (hidden) — the effect sets it to false if not dismissed.
  // Prevents the pill from flashing visible on pages where it was already dismissed.
  const [pillDismissed, setPillDismissed] = useState(true)

  useEffect(() => {
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
    setUnread(lastSeen !== latestVersion)

    try {
      const raw = localStorage.getItem(DISMISSED_KEY)
      const dismissed = JSON.parse(raw ?? '[]') as unknown[]
      const isDismissed =
        Array.isArray(dismissed) && dismissed.includes(latestVersion)
      setPillDismissed(isDismissed)
    } catch (err) {
      console.warn(
        'useReleaseReadState: failed to parse dismissed spotlights',
        err,
      )
      setPillDismissed(false)
    }
  }, [latestVersion])

  const markSeen = useCallback(() => {
    localStorage.setItem(LAST_SEEN_KEY, latestVersion)
    setUnread(false)
  }, [latestVersion])

  const dismissPill = useCallback(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY)
      const existing = JSON.parse(raw ?? '[]') as unknown[]
      const dismissed = Array.isArray(existing) ? existing : []
      const updated = [...new Set([...dismissed, latestVersion])]
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated))
    } catch (err) {
      console.warn(
        'useReleaseReadState: failed to save dismissed spotlight',
        err,
      )
    }
    setPillDismissed(true)
  }, [latestVersion])

  return { unread, pillDismissed, markSeen, dismissPill }
}
