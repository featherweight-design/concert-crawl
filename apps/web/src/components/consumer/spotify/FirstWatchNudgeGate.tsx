'use client'

// Post-first-watch Spotify nudge gate (#763 PR 5). Mounted in
// (protected)/layout next to the other gates. Subscribes to the react-query
// mutation cache for the first successful watch-toggle that lands on
// `watching: true`, then asks GET /v1/spotify/nudge whether this user should
// see the nudge (server predicate: no connection row AND never seen). When
// displayed it is marked seen immediately — one impression ever, regardless
// of what the user picks. "Connect Spotify" opens the honesty-rail handoff.

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import {
  fetchSpotifyNudgeEligibility,
  markSpotifyNudgeSeen,
} from '@/lib/spotify'
import { FirstWatchNudge } from './FirstWatchNudge'
import { OAuthHandoffSheet } from './OAuthHandoffSheet'

// Matches the mutationKey set in lib/queries/use-watch-toggle.ts.
const WATCH_TOGGLE_MUTATION_KEY = 'watch-toggle'

// Narrow the untyped mutation-cache payload without casts: a successful
// watch toggle resolves to WatchToggleResponse, whose `watching` flag tells
// unwatch (false) apart from watch (true).
const isWatchOn = (data: unknown): boolean =>
  typeof data === 'object' &&
  data !== null &&
  'watching' in data &&
  data.watching === true

export const FirstWatchNudgeGate = () => {
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { getToken, isSignedIn } = useAuth()

  const [show, setShow] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  // One eligibility check per page lifetime — the server's seen-marker
  // guarantees once-ever across sessions.
  const triggeredRef = useRef(false)

  const hidden = pathname.startsWith('/admin')
  // Ref mirror so the cache listener sees the current route without the
  // effect re-subscribing on every navigation.
  const hiddenRef = useRef(hidden)
  hiddenRef.current = hidden

  useEffect(() => {
    // A signed-out visitor can't have a watch toggle succeed, and the
    // eligibility endpoint is authed. Guarding inside the effect body keeps
    // the subscription attaching once sign-in lands.
    if (!isSignedIn) return

    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (hiddenRef.current) return
      if (triggeredRef.current) return
      if (event.type !== 'updated') return
      if (
        event.mutation.options.mutationKey?.[0] !== WATCH_TOGGLE_MUTATION_KEY
      ) {
        return
      }
      if (event.action.type !== 'success') return
      if (!isWatchOn(event.action.data)) return
      triggeredRef.current = true
      void (async () => {
        let displayed = false
        try {
          const token = await getToken()
          if (!token) {
            // Clerk not ready yet — release the trigger so a later watch
            // can retry instead of losing the nudge for the page lifetime.
            triggeredRef.current = false
            return
          }
          const { eligible } = await fetchSpotifyNudgeEligibility(token)
          if (!eligible) return
          setShow(true)
          displayed = true
          // Marked seen when DISPLAYED — dismissal vs connect doesn't matter.
          await markSpotifyNudgeSeen(token)
        } catch (err) {
          // Transient failure before the nudge rendered — release the
          // trigger so a later watch retries (same reasoning as the token
          // gap). Once displayed, once-per-page stands even if the seen
          // marker failed.
          if (!displayed) triggeredRef.current = false
          console.error('Failed to run first-watch Spotify nudge', err)
        }
      })()
    })
    return unsubscribe
  }, [queryClient, getToken, isSignedIn])

  if (hidden) return null

  return (
    <>
      {show && (
        <FirstWatchNudge
          onConnect={() => {
            setShow(false)
            setHandoffOpen(true)
          }}
          onDismiss={() => setShow(false)}
        />
      )}
      <OAuthHandoffSheet
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
      />
    </>
  )
}
