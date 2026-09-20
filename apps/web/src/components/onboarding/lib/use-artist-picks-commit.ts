'use client'

// The one write in the whole tour.
//
// Onboarding may never become a wall. Every failure path here ends by letting
// the visitor move on: an unknown error advances (the picks are simply not
// made), and only the ENTITLEMENT path holds the step, because that one has
// somewhere to send them and something to come back to.

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQueryClient } from '@tanstack/react-query'
import { canUseFeature } from '@concert-crawl/entitlements'
import type { PlanState } from '@concert-crawl/types'
import { ApiError } from '@/lib/api'
import { ENTITLEMENT_REQUIRED_CODE } from '@/lib/history'
import { followArtistsBulk } from '@/lib/following'
import { fetchMe } from '@/lib/users'
import { planStateQueryKey } from '@/lib/queries/use-plan-state'
import {
  ARTIST_PICKS_KEY,
  GENRE_PICKS_KEY,
  SEARCH_PICKS_KEY,
  STEP_INDEX_KEY,
  clearPicks,
} from '@/components/consumer/artist-picker'

interface ArtistPicksCommit {
  /** True only while the bulk call is in flight (ACC-16). */
  pending: boolean
  pickerOpen: boolean
  commit: (slugs: readonly string[]) => void
  closePicker: () => void
}

/**
 * @param onDone Called once the step is finished with — a successful write, an
 * empty selection, or a failure we have decided not to make the visitor's
 * problem. Never called while the picker is open.
 */
export function useArtistPicksCommit(onDone: () => void): ArtistPicksCommit {
  const { getToken, userId } = useAuth()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // The selection that hit a 403, held so closing the picker can retry the
  // same write without asking the caller to hand it over again.
  const heldSlugs = useRef<readonly string[]>([])
  const inFlight = useRef(false)

  // Every exit that ends the step goes through here, and the 403 path is the
  // one that must NOT: it returns early so an interrupted upgrade comes back
  // to the grid it left.
  //
  // Both keys clear together. The genres key is not the artists key's
  // companion — it is a filter for a screen that is now behind the visitor,
  // and the step's own lede promises we don't save it. Leaving it behind would
  // make that a lie on the next visit to /onboarding, which would open
  // pre-filtered by months-old buckets that may no longer be in the listings
  // at all, silently hiding suggestions.
  const finishStep = useCallback(() => {
    clearPicks(ARTIST_PICKS_KEY)
    clearPicks(GENRE_PICKS_KEY)
    // The step mirror goes with them. It exists to survive the upgrade round
    // trip, and that trip is over: leaving it behind would reopen the tour on
    // the artists step for a visitor who has finished with it.
    clearPicks(SEARCH_PICKS_KEY)
    clearPicks(STEP_INDEX_KEY)
    onDone()
  }, [onDone])

  const runCommit = useCallback(
    async (slugs: readonly string[]): Promise<void> => {
      if (inFlight.current) return
      inFlight.current = true
      setPending(true)
      try {
        const token = await getToken()
        if (!token) throw new Error('Not authenticated')
        await followArtistsBulk(token, slugs)
        finishStep()
      } catch (err: unknown) {
        if (err instanceof ApiError && err.code === ENTITLEMENT_REQUIRED_CODE) {
          console.info('onboarding follow picks need Premium; opening picker')
          heldSlugs.current = slugs
          setPickerOpen(true)
          return
        }
        // A failed write is not worth stranding someone on step 7 of 8. Log it
        // and move on; the artists are all still followable from search.
        console.warn('onboarding bulk follow failed; continuing', err)
        finishStep()
      } finally {
        inFlight.current = false
        setPending(false)
      }
    },
    [getToken, finishStep],
  )

  const commit = useCallback(
    (slugs: readonly string[]) => {
      if (slugs.length === 0) {
        // Nothing to write. Skipping is a first-class outcome here, so it
        // clears the mirror rather than leaving picks for a step that is done.
        finishStep()
        return
      }
      void runCommit(slugs)
    },
    [finishStep, runCommit],
  )

  const closePicker = useCallback(() => {
    setPickerOpen(false)
    const slugs = heldSlugs.current
    if (slugs.length === 0) return
    void (async () => {
      try {
        const token = await getToken()
        if (!token) return
        // Re-read rather than trusting the cached plan: the picker may have
        // just taken a payment, and the cached PlanState is up to five minutes
        // stale. Retrying blind would 403 again and reopen the picker in a loop.
        const profile = await fetchMe(token)
        const planState: PlanState = profile.planState
        queryClient.setQueryData(planStateQueryKey(userId), planState)
        if (!canUseFeature(planState, 'following')) return
        await runCommit(slugs)
      } catch (err: unknown) {
        console.warn('onboarding entitlement re-read failed', err)
      }
    })()
  }, [getToken, queryClient, runCommit, userId])

  return { pending, pickerOpen, commit, closePicker }
}
