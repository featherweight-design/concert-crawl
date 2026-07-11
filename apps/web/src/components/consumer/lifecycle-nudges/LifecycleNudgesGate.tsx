'use client'

// Lifecycle nudges gate (#780, PR 4.2 + #775, PR 4.3). Mounted in
// (protected)/layout — establishes the browser-session marker (spec
// Decision 9), fetches GET /v1/users/me?sessionStartedAt= once, and
// renders at most one nudge: trial-ended takeover > day-13 banner >
// past-due banner (the server predicates make day13/past-due mutually
// exclusive, but the ordering stays explicit).

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { fetchMe } from '@/lib/users'
import { dismissNudge, markTrialTakeoverShown } from '@/lib/billing'
import { navigateToPortalSession } from '@/lib/portal-navigation'
import { PLAN_SETTINGS_ROUTE } from '@/components/consumer/tier-picker/definitions/constants'
import { usePaymentFlowActive } from '@/components/consumer/tier-picker/lib/payment-flow-signal'
import { TrialEndedTakeover } from './TrialEndedTakeover'
import { DayThirteenBanner } from './DayThirteenBanner'
import { PastDueBanner } from './PastDueBanner'
import { SESSION_STARTED_AT_KEY } from './definitions/constants'

interface NudgeFlags {
  showTrialEndedTakeover: boolean
  showDayThirteenBanner: boolean
  showPastDueBanner: boolean
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
  const { getToken, isSignedIn } = useAuth()

  const [flags, setFlags] = useState<NudgeFlags | null>(null)
  const [dismissed, setDismissed] = useState(false)
  // Past-due has its own dismissed state — `dismissed` belongs to the
  // takeover/day-13 pair.
  const [pastDueDismissed, setPastDueDismissed] = useState(false)
  const [updateCardPending, setUpdateCardPending] = useState(false)
  const fetchedRef = useRef(false)
  const shownRef = useRef(false)
  const paymentFlowActive = usePaymentFlowActive()

  const hidden = pathname.startsWith('/admin')

  useEffect(() => {
    // isSignedIn gates before the ref locks — a mount while Clerk is still
    // resolving (isSignedIn undefined/false) retries once sign-in lands
    // instead of burning the once-per-mount fetch on a null token.
    if (hidden || !isSignedIn || fetchedRef.current) return
    fetchedRef.current = true
    void (async () => {
      try {
        const token = await getToken()
        if (!token) return
        const marker = readSessionMarker()
        const me = await fetchMe(token, marker)
        setFlags({
          showTrialEndedTakeover: me.showTrialEndedTakeover,
          showDayThirteenBanner: me.showDayThirteenBanner,
          showPastDueBanner: me.showPastDueBanner,
        })
      } catch (err) {
        console.error('Failed to load lifecycle nudge flags', err)
      }
    })()
  }, [hidden, isSignedIn, getToken])

  const showTakeover =
    !hidden && !dismissed && flags !== null && flags.showTrialEndedTakeover
  const showBanner =
    !hidden &&
    !dismissed &&
    flags !== null &&
    !flags.showTrialEndedTakeover &&
    flags.showDayThirteenBanner
  // Suppressed (not dismissed) while a payment flow is active — the user
  // is already fixing the card, don't double-stack the alert.
  const showPastDue =
    !hidden &&
    !pastDueDismissed &&
    !paymentFlowActive &&
    flags !== null &&
    !flags.showTrialEndedTakeover &&
    !flags.showDayThirteenBanner &&
    flags.showPastDueBanner

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

  if (showPastDue) {
    return (
      <PastDueBanner
        variant="pinned"
        updateCardPending={updateCardPending}
        onDismiss={() => {
          setPastDueDismissed(true)
          // Fire-and-forget — the banner hides immediately either way.
          void (async () => {
            try {
              const token = await getToken()
              if (!token) return
              await dismissNudge(token, 'past-due')
            } catch (err) {
              console.error('Failed to dismiss past-due nudge', err)
            }
          })()
        }}
        onUpdateCard={() => {
          setUpdateCardPending(true)
          void (async () => {
            try {
              await navigateToPortalSession(getToken)
            } catch (err) {
              console.error('Failed to open billing portal', err)
              // Navigation failed — re-enable the CTA so the user can retry.
              setUpdateCardPending(false)
            }
          })()
        }}
      />
    )
  }

  return null
}
