'use client'

// Follow state for a whole bill.
//
// `useArtistFollow` is deliberately single-artist: it owns one boolean and
// reconciles it against one response. A bill has N acts AND a bulk commit that
// moves all of them at once, so per-row hooks would each hold a boolean the
// bulk write could not reach. One set, owned here, is the only shape where
// "Follow all" and a single row can both be right afterwards.
//
// The optimistic contract is the same one `useArtistFollow` documents: flip
// first, take the SERVER's answer on success (unfollowing an act a Spotify
// sync also holds legitimately comes back still-following), roll back on
// failure, and route a branded 403 to the upgrade path rather than leaving the
// tap looking like it did nothing.

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'

import { ApiError, apiClient } from '@/lib/api'
import { ENTITLEMENT_REQUIRED_CODE } from '@/lib/history'
import { followArtistsBulk } from '@/lib/following'
import type { BillArtist } from './bill-artists'

export interface BillFollowsResult {
  following: ReadonlySet<string>
  /** True only while the BULK write is in flight — the single rows have no
   * pending skin, by design (a 120ms flash is not feedback). */
  committing: boolean
  toggle: (slug: string) => void
  followAll: () => void
}

const isFollowResponse = (value: unknown): value is { following: boolean } =>
  typeof value === 'object' &&
  value !== null &&
  'following' in value &&
  typeof Reflect.get(value, 'following') === 'boolean'

const seedFollowing = (artists: BillArtist[]): Set<string> =>
  new Set(artists.filter((artist) => artist.following).map((row) => row.slug))

export const useBillFollows = (
  artists: BillArtist[],
  onEntitlementRequired: () => void,
): BillFollowsResult => {
  const { getToken } = useAuth()
  const [following, setFollowing] = useState<Set<string>>(() =>
    seedFollowing(artists),
  )
  const [committing, setCommitting] = useState(false)
  // Per-slug, so following two acts at once is allowed while double-tapping
  // one is not. A single boolean would make the second row wait on the first.
  const rowsInFlight = useRef<Set<string>>(new Set())
  const bulkInFlight = useRef(false)

  const toggle = useCallback(
    (slug: string) => {
      if (rowsInFlight.current.has(slug)) return
      rowsInFlight.current.add(slug)

      const wasFollowing = following.has(slug)
      setFollowing((current) => {
        const next = new Set(current)
        if (wasFollowing) next.delete(slug)
        else next.add(slug)
        return next
      })

      void (async () => {
        try {
          const token = await getToken()
          if (!token) throw new Error('Not authenticated')
          const path = `/v1/artists/${slug}/follow`
          const result = wasFollowing
            ? await apiClient.delete<unknown>(path, token)
            : await apiClient.post<unknown>(path, token, {})
          // A 2xx we cannot read is not a success we can act on — keeping the
          // guess would strand the row against a server we just failed to
          // understand. Throw into the rollback below.
          if (!isFollowResponse(result)) {
            throw new Error('Unexpected follow response shape')
          }
          const settled = result.following
          setFollowing((current) => {
            const next = new Set(current)
            if (settled) next.add(slug)
            else next.delete(slug)
            return next
          })
        } catch (err) {
          setFollowing((current) => {
            const next = new Set(current)
            if (wasFollowing) next.add(slug)
            else next.delete(slug)
            return next
          })
          if (
            err instanceof ApiError &&
            err.code === ENTITLEMENT_REQUIRED_CODE
          ) {
            console.info('bill follow needs Premium; opening the tier picker')
            onEntitlementRequired()
            return
          }
          console.warn('bill follow toggle failed; rolling back', err)
        } finally {
          rowsInFlight.current.delete(slug)
        }
      })()
    },
    [following, getToken, onEntitlementRequired],
  )

  const followAll = useCallback(() => {
    if (bulkInFlight.current) return
    const slugs = artists
      .map((artist) => artist.slug)
      .filter((slug) => !following.has(slug))
    if (slugs.length === 0) return

    bulkInFlight.current = true
    setCommitting(true)
    const previous = following

    void (async () => {
      try {
        const token = await getToken()
        if (!token) throw new Error('Not authenticated')
        const response = await followArtistsBulk(token, slugs)
        // Applied PER SLUG, not all-or-nothing: an act whose projection row
        // has gone (`artist_not_found`) must not leave a Following pill behind
        // while its neighbours legitimately succeeded.
        setFollowing((current) => {
          const next = new Set(current)
          for (const row of response.results) {
            if (row.status === 'artist_not_found') next.delete(row.slug)
            else next.add(row.slug)
          }
          return next
        })
      } catch (err) {
        setFollowing(previous)
        if (err instanceof ApiError && err.code === ENTITLEMENT_REQUIRED_CODE) {
          console.info('bulk bill follow needs Premium; opening the picker')
          onEntitlementRequired()
          return
        }
        console.warn('bulk bill follow failed; rolling back', err)
      } finally {
        bulkInFlight.current = false
        setCommitting(false)
      }
    })()
  }, [artists, following, getToken, onEntitlementRequired])

  const result: BillFollowsResult = { following, committing, toggle, followAll }
  return result
}
