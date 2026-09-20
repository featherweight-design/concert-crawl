'use client'

// The tour's in-step artist search.
//
// It queries `/v1/search/artists` — the SAME index `/search` queries — rather
// than a second endpoint built for onboarding, so "which artists exist" has one
// answer. What differs is the shape it hands back: `PickArtist`, the same type
// the suggestion tiles take, because inside the tour a result is a thing you
// SELECT and not a thing you follow. Nothing here writes.
//
// ⚠️ CALLED FROM THE SHELL, never from the picker — the same rule, and the same
// reason, as `useOnboardingSuggestions`. The tour renders its mobile and its
// desktop tree at once (one of them `display:none`, which does not stop a hook
// running), so a fetch mounted in the step fires TWICE per keystroke and keeps
// two result caches that can disagree.

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { formatShortDate } from '@/components/consumer/definitions/lib'
import type { ArtistSearchResult } from '@concert-crawl/types'
import type { PickArtist } from '../definitions/types'
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_QUERY } from '../definitions/constants'

/**
 * `rest` is not an empty state — it is the field waiting, before anyone has
 * typed the two characters the endpoint requires. Kept distinct from `none` so
 * the body can prompt rather than apologise.
 *
 * `allFollowed` is the other distinction that has to be drawn: the endpoint
 * slices to three rows BEFORE this hook drops the ones already followed, so a
 * query whose closest three matches are all followed would otherwise read as
 * "Nobody by that name" — a flat untruth about an artist the visitor follows.
 */
export type ArtistSearchState =
  'rest' | 'typing' | 'results' | 'none' | 'allFollowed'

interface ArtistSearch {
  results: PickArtist[]
  state: ArtistSearchState
}

/**
 * Reads the payload rather than asserting it. `res.json()` is `any` over bytes
 * this client did not produce, and the house rule is that a cast silences the
 * compiler without checking anything. A row missing the fields the tile needs
 * is dropped rather than rendered half-built.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * Every field the row goes on to read, not just the two that name it.
 * `toPickArtist` dereferences `nextShow.iso`, so a row carrying a malformed
 * `nextShow` would reach the formatter and throw — which is precisely the
 * hazard a guard that checked `slug` and `name` alone would wave through.
 */
const isSearchRow = (value: unknown): value is ArtistSearchResult => {
  if (!isRecord(value)) return false
  if (typeof value['slug'] !== 'string' || typeof value['name'] !== 'string') {
    return false
  }
  const photoUrl = value['photoUrl']
  if (photoUrl !== null && typeof photoUrl !== 'string') return false
  if (typeof value['following'] !== 'boolean') return false
  const nextShow = value['nextShow']
  if (nextShow === null) return true
  return isRecord(nextShow) && typeof nextShow['iso'] === 'string'
}

const readSearchRows = (body: unknown): ArtistSearchResult[] => {
  if (!isRecord(body)) return NO_ROWS
  if (body['success'] !== true || !Array.isArray(body['data'])) return NO_ROWS
  return body['data'].filter(isSearchRow)
}

const NO_ROWS: ArtistSearchResult[] = []

const toPickArtist = (row: ArtistSearchResult): PickArtist => ({
  slug: row.slug,
  name: row.name,
  photoUrl: row.photoUrl,
  // Null is a real answer here, not a missing one: search lists any artist with
  // a non-hidden event, and "played Denver before, nothing upcoming" is the
  // clearest reason to follow someone. The row draws its own line for it.
  dateLabel: row.nextShow ? formatShortDate(row.nextShow.iso) : null,
})

/** Shared by every "nothing to show" branch, so a reset never allocates a new
 *  array. A fresh `[]` is a new reference, which re-renders, which re-runs the
 *  effect below — and that is an infinite loop rather than a wasted render. */
const NO_RESULTS: PickArtist[] = []

export function useArtistSearch(query: string): ArtistSearch {
  const { getToken } = useAuth()
  const [results, setResults] = useState<PickArtist[]>(NO_RESULTS)
  const [state, setState] = useState<ArtistSearchState>('rest')
  // Guards the response, not the request: an abort already stops the fetch, but
  // a resolved-then-aborted promise can still land after a newer query started.
  const latestQuery = useRef('')
  // Read through a ref rather than listed as a dependency. `useAuth()` is not
  // contractually required to hand back the same `getToken` on every render,
  // and an unstable one makes the query a function of the render rather than
  // of the text: the effect re-runs, aborts its own in-flight request, and
  // starts another — a fetch per render for as long as the field is open.
  const getTokenRef = useRef(getToken)
  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  useEffect(() => {
    const trimmed = query.trim()
    latestQuery.current = trimmed

    if (trimmed.length < SEARCH_MIN_QUERY) {
      setResults(NO_RESULTS)
      setState('rest')
      return
    }

    // Set BEFORE the debounce rather than inside it, so a keystroke moves the
    // body to skeletons immediately. Deferring it leaves the previous query's
    // rows on screen for the whole debounce, which reads as a search that
    // ignored what you just typed.
    setState('typing')

    const controller = new AbortController()
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const token = await getTokenRef.current()
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
          const res = await fetch(
            `${apiUrl}/v1/search/artists?q=${encodeURIComponent(trimmed)}`,
            {
              signal: controller.signal,
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          )
          const body: unknown = await res.json()
          if (latestQuery.current !== trimmed) return
          // Already-followed artists are dropped here for the same reason
          // the suggestions read drops them: the row has one unchecked state
          // and no way to say "you already have this one", so offering it
          // lets the visitor tick something the commit cannot change — and
          // the rail counts it, promising a follow that writes nothing.
          const matched = readSearchRows(body)
          const rows = matched.filter((row) => !row.following).map(toPickArtist)
          setResults(rows)
          setState(
            rows.length > 0
              ? 'results'
              : matched.length > 0
                ? 'allFollowed'
                : 'none',
          )
        } catch (err: unknown) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          if (latestQuery.current !== trimmed) return
          // A failed search reads as "nobody by that name" rather than growing
          // a fifth state. The step has a suggestion grid to go back to and a
          // rail that commits whatever is already picked, so there is nothing
          // here for an error state to offer that `none` does not.
          console.warn('onboarding artist search failed', err)
          setResults(NO_RESULTS)
          setState('none')
        }
      })()
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { results, state }
}
