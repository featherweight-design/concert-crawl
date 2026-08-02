'use client'

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

import { apiClient } from '@/lib/api'

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

export const useArtistFollow = (slug: string, initialFollowing: boolean) => {
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
        if (isFollowResponse(result)) setFollowing(result.following)
      } catch (err) {
        console.warn('artist follow toggle failed; rolling back', err)
        setFollowing(previous)
      } finally {
        inFlight.current = false
        setPending(false)
      }
    })()
  }, [following, getToken, slug])

  const result: ArtistFollowResult = { following, pending, toggle }
  return result
}
