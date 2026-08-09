'use client'

// The trigger behind the first-watch follow nudge (native following, PR 10).
//
// It watches the react-query mutation cache for a successful watch-toggle
// rather than being called from the toggle's own click handler, because the
// watch can be started from four different controls (event detail's strip, the
// browse hero card, the artist-page rows, the post-signup replay) and a hook
// wired into each of them is four places for the nudge to be forgotten.
//
// TWO consumers, one hook. Passing an `eventId` scopes it to that show, which
// is what the in-place card on event detail needs; passing nothing takes any
// watch, which is what the floating card needs. The two never both fire,
// because the floating gate excludes the event-detail route (see
// FollowNudgeGate).

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'

import {
  isFollowNudgeAnswered,
  markFollowNudgeAnswered,
} from './nudge-dismissal'

// Matches the mutationKey set in lib/queries/use-watch-toggle.ts.
const WATCH_TOGGLE_MUTATION_KEY = 'watch-toggle'

export interface FollowNudgeTarget {
  eventId: string
  /** The watch row. The dismissal is keyed on this, never on `eventId`. */
  userEventId: string
  artist: string
  artistSlug: string
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readString = (
  source: Record<string, unknown>,
  key: string,
): string | null => {
  const value = source[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Narrow the untyped cache payload to a nudgeable target, without casts.
 *
 * Every null return is a legitimate resting state, not an error: an un-watch
 * carries `watching: false`, and an artist the projection has no row for
 * carries a null `artistSlug` and therefore has no page to follow.
 */
const toTarget = (
  eventId: string,
  data: unknown,
): Omit<FollowNudgeTarget, 'eventId'> | null => {
  if (!isObject(data)) return null
  if (data.watching !== true) return null
  const userEventId = readString(data, 'userEventId')
  const artist = readString(data, 'artist')
  const artistSlug = readString(data, 'artistSlug')
  if (userEventId === null || artist === null || artistSlug === null) {
    return null
  }
  return { userEventId, artist, artistSlug }
}

/** The eventId the toggle was called with, which rides on the mutation state. */
const toEventId = (state: unknown): string | null => {
  if (!isObject(state)) return null
  return readString(state, 'variables')
}

export interface FirstWatchNudgeResult {
  target: FollowNudgeTarget | null
  /**
   * Close it, however the user answered. Dismissing and following are the same
   * outcome here: the introduction has been made, and the permanent path (the
   * bill's follow block, directly below) takes over from now on.
   */
  answer: () => void
}

export const useFirstWatchNudge = (
  /** Scope to one show. Omit to take a watch on any show. */
  eventId?: string,
  /**
   * Whether this consumer is allowed to hold a nudge right now. The floating
   * gate turns it off on event-detail routes, where the in-place card owns the
   * same watch. It CLEARS an existing target rather than only hiding it: a
   * target captured on a route this consumer does not serve would otherwise
   * pop up the moment the user navigated somewhere it does.
   */
  enabled = true,
): FirstWatchNudgeResult => {
  const queryClient = useQueryClient()
  const { isSignedIn } = useAuth()
  const [target, setTarget] = useState<FollowNudgeTarget | null>(null)

  // Ref mirror so the cache listener reads the current scope without the
  // effect re-subscribing, which would drop an in-flight notification.
  const scopeRef = useRef(eventId)
  scopeRef.current = eventId
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    if (!enabled) setTarget(null)
  }, [enabled])

  useEffect(() => {
    // A signed-out visitor cannot have a watch toggle succeed, and nothing
    // below is meaningful without an account to hang a follow on. Guarding in
    // the effect body keeps the subscription attaching once sign-in lands.
    if (!isSignedIn) return

    return queryClient.getMutationCache().subscribe((event) => {
      if (!enabledRef.current) return
      if (event.type !== 'updated') return
      if (
        event.mutation.options.mutationKey?.[0] !== WATCH_TOGGLE_MUTATION_KEY
      ) {
        return
      }
      if (event.action.type !== 'success') return

      const watchedEventId = toEventId(event.mutation.state)
      if (watchedEventId === null) return
      const scope = scopeRef.current
      if (scope !== undefined && scope !== watchedEventId) return

      const next = toTarget(watchedEventId, event.action.data)
      if (next === null) return
      // Read at fire time, not at mount: a dismissal taken earlier in this
      // same session must count, and the store is the only record of it.
      if (isFollowNudgeAnswered(next.userEventId)) return

      setTarget({ eventId: watchedEventId, ...next })
    })
  }, [queryClient, isSignedIn])

  const answer = () => {
    if (target !== null) markFollowNudgeAnswered(target.userEventId)
    setTarget(null)
  }

  return { target, answer }
}
