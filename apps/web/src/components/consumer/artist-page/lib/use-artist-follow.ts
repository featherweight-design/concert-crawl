'use client'

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

import { ApiError, apiClient } from '@/lib/api'
import { ENTITLEMENT_REQUIRED_CODE } from '@/lib/history'

interface ArtistFollowResult {
  following: boolean
  /** True while a request is in flight — a second click is swallowed. */
  pending: boolean
  toggle: () => void
}

/**
 * The relationship is rendered in up to three places at once (hero, sticky
 * sub-header, empty-upcoming block), so the state has to live above all of
 * them. The button itself stays presentational.
 *
 * The flip is optimistic and rolls back on failure. On success we take the
 * SERVER's answer, not our guess: unfollowing an artist whose follow also came
 * from a Spotify sync leaves the follow standing, and the API reports that
 * effective state.
 */
const isFollowResponse = (value: unknown): value is { following: boolean } =>
  typeof value === 'object' &&
  value !== null &&
  'following' in value &&
  typeof Reflect.get(value, 'following') === 'boolean'

export const useArtistFollow = (
  slug: string,
  initialFollowing: boolean,
  onEntitlementRequired?: () => void,
) => {
  const { getToken } = useAuth()
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, setPending] = useState(false)
  const inFlight = useRef(false)

  const toggle = useCallback(() => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)

    const previous = following
    const next = !previous
    setFollowing(next)

    void (async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('Not authenticated')
        const path = `/v1/artists/${slug}/follow`
        const result = next
          ? await apiClient.post<unknown>(path, token, {})
          : await apiClient.delete<unknown>(path, token)
        // A 2xx whose body we can't read is not a success we can act on —
        // keeping the optimistic guess would strand the UI out of sync with a
        // server we just failed to understand. Throw into the rollback below.
        if (!isFollowResponse(result)) {
          throw new Error('Unexpected follow response shape')
        }
        setFollowing(result.following)
      } catch (err) {
        setFollowing(previous)
        // Following is Premium. A rollback on its own is indistinguishable
        // from a dead button, so route the branded 403 to the upgrade path
        // rather than leaving the tap looking like it did nothing.
        if (err instanceof ApiError && err.code === ENTITLEMENT_REQUIRED_CODE) {
          onEntitlementRequired?.()
          return
        }
        console.warn('artist follow toggle failed; rolling back', err)
      } finally {
        inFlight.current = false
        setPending(false)
      }
    })()
  }, [following, getToken, slug, onEntitlementRequired])

  const result: ArtistFollowResult = { following, pending, toggle }
  return result
}
