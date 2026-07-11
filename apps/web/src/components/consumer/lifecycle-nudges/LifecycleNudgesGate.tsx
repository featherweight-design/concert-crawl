'use client'

// Lifecycle nudges gate (#780, PR 4.2). Mounted in (protected)/layout —
// establishes the browser-session marker (spec Decision 9), fetches
// GET /v1/users/me?sessionStartedAt= once, and renders at most one nudge:
// trial-ended takeover > day-13 banner. showPastDueBanner is intentionally
// NOT rendered here — the past-due banner ships in PR 4.3.

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { fetchMe } from '@/lib/users'
import { dismissNudge, markTrialTakeoverShown } from '@/lib/billing'
import { PLAN_SETTINGS_ROUTE } from '@/components/consumer/tier-picker/definitions/constants'
import { TrialEndedTakeover } from './TrialEndedTakeover'
import { DayThirteenBanner } from './DayThirteenBanner'
import { SESSION_STARTED_AT_KEY } from './definitions/constants'

interface NudgeFlags {
  showTrialEndedTakeover: boolean
  showDayThirteenBanner: boolean
}

// Set once per sessionStorage lifetime; sessionStorage can throw in some
// privacy modes, in which case we fall back to a fresh timestamp (the
// nudges then behave as if every page load is a new session — acceptable
// degradation per the spec).
const readSessionMarker = (): string => {
  const now = new Date().toISOString()
  try {
    const existing = window.sessionStorage.getItem(SESSION_STARTED_AT_KEY)
    if (existing) return existing
    window.sessionStorage.setItem(SESSION_STARTED_AT_KEY, now)
    return now
  } catch (err) {
    console.error('Failed to read/write session marker', err)
    return now
  }
}

export const LifecycleNudgesGate = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { getToken } = useAuth()

  const [flags, setFlags] = useState<NudgeFlags | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const fetchedRef = useRef(false)
  const shownRef = useRef(false)

  const hidden = pathname.startsWith('/admin')

  useEffect(() => {
    if (hidden || fetchedRef.current) return
    fetchedRef.current = true
    void (async () => {
      try {
        const token = await getToken()
        // Signed-out (public pages under the shared shell) — no nudges.
        if (!token) return
        const marker = readSessionMarker()
        const me = await fetchMe(token, marker)
        setFlags({
          showTrialEndedTakeover: me.showTrialEndedTakeover,
          showDayThirteenBanner: me.showDayThirteenBanner,
        })
      } catch (err) {
        console.error('Failed to load lifecycle nudge flags', err)
      }
    })()
  }, [hidden, getToken])

  const showTakeover =
    !hidden && !dismissed && flags !== null && flags.showTrialEndedTakeover
  const showBanner =
    !hidden &&
    !dismissed &&
    flags !== null &&
    !flags.showTrialEndedTakeover &&
    flags.showDayThirteenBanner

  // Record the takeover impression exactly once — the API flips the flag
  // off for subsequent sessions.
  useEffect(() => {
    if (!showTakeover || shownRef.current) return
    shownRef.current = true
    void (async () => {
      try {
        const token = await getToken()
        if (!token) return
        await markTrialTakeoverShown(token)
      } catch (err) {
        console.error('Failed to mark trial takeover shown', err)
      }
    })()
  }, [showTakeover, getToken])

  if (showTakeover) {
    return (
      <TrialEndedTakeover
        onDismiss={() => setDismissed(true)}
        onSelectTier={() => {
          setDismissed(true)
          router.push(PLAN_SETTINGS_ROUTE)
        }}
      />
    )
  }

  if (showBanner) {
    return (
      <DayThirteenBanner
        variant="pinned"
        onDismiss={() => {
          setDismissed(true)
          // Fire-and-forget — the banner hides immediately either way.
          void (async () => {
            try {
              const token = await getToken()
              if (!token) return
              await dismissNudge(token, 'day13')
            } catch (err) {
              console.error('Failed to dismiss day-13 nudge', err)
            }
          })()
        }}
      />
    )
  }

  return null
}
