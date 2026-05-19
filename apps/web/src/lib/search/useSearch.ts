'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthToken } from './useAuthToken'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const RECENT_KEY = 'cc_recent_searches'
const MAX_RECENT = 5
const DEBOUNCE_MS = 300

export interface ArtistResult {
  name: string
  nextDate: string
  venueShort: string
}

export interface VenueResult {
  name: string
  slug: string
  showCount: number
  matchingEventId: string
}

export interface PopularEvent {
  id: string
  title: string
  artist: string
  date: string
  ticketPriceMin: string | null
  watcherCount: number
  venue: { name: string; slug: string }
}

interface EventRow {
  id: string
  artist: string
  date: string
  title: string
  venue: { name: string; slug: string }
}

function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeRecent(searches: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(RECENT_KEY, JSON.stringify(searches))
}

function addToRecent(query: string, current: string[]): string[] {
  const filtered = current.filter((search) => search !== query)
  return [query, ...filtered].slice(0, MAX_RECENT)
}

function deriveArtistResults(rows: EventRow[]): ArtistResult[] {
  const map = new Map<string, ArtistResult>()
  for (const row of rows) {
    const existing = map.get(row.artist)
    if (!existing || row.date < existing.nextDate) {
      map.set(row.artist, {
        name: row.artist,
        nextDate: row.date,
        venueShort: row.venue.name,
      })
    }
  }
  return Array.from(map.values())
}

function deriveVenueResults(rows: EventRow[]): VenueResult[] {
  const map = new Map<string, VenueResult>()
  for (const row of rows) {
    const existing = map.get(row.venue.slug)
    if (existing) {
      existing.showCount += 1
    } else {
      map.set(row.venue.slug, {
        name: row.venue.name,
        slug: row.venue.slug,
        showCount: 1,
        matchingEventId: row.id,
      })
    }
  }
  return Array.from(map.values())
}

export function useSearch() {
  const router = useRouter()
  const getToken = useAuthToken()
  const [query, setQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [popularEvents, setPopularEvents] = useState<PopularEvent[]>([])
  const [artistResults, setArtistResults] = useState<ArtistResult[]>([])
  const [venueResults, setVenueResults] = useState<VenueResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setRecentSearches(readRecent())

    void (async () => {
      try {
        const token = await getToken()
        fetch(`${API_URL}/v1/search/popular`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then((res) => res.json())
          .then((body: { success: boolean; data: PopularEvent[] }) => {
            if (body.success) setPopularEvents(body.data)
          })
          .catch((err: unknown) => {
            console.error(err)
          })
      } catch (err) {
        console.error(err)
      }
    })()
  }, [getToken])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()

    const trimmed = query.trim()
    if (!trimmed) {
      setArtistResults([])
      setVenueResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController()
      abortRef.current = controller
      void (async () => {
        try {
          const token = await getToken()
          fetch(
            `${API_URL}/v1/events?search=${encodeURIComponent(trimmed)}&limit=100`,
            {
              signal: controller.signal,
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          )
            .then((res) => res.json())
            .then((body: { success: boolean; data: { data: EventRow[] } }) => {
              if (body.success) {
                setArtistResults(deriveArtistResults(body.data.data))
                setVenueResults(deriveVenueResults(body.data.data))
              }
            })
            .catch((err: unknown) => {
              if (err instanceof DOMException && err.name === 'AbortError')
                return
              console.error(err)
            })
            .finally(() => {
              if (!controller.signal.aborted) setIsLoading(false)
            })
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return
          console.error(err)
        }
      })()
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [query, getToken])

  const clearQuery = useCallback(() => {
    setQuery('')
    setArtistResults([])
    setVenueResults([])
  }, [])

  const navigateTo = useCallback(
    (
      type: 'artist' | 'venue',
      value: string | { slug: string; matchingEventId?: string },
    ) => {
      if (query.trim()) {
        const updated = addToRecent(query.trim(), recentSearches)
        setRecentSearches(updated)
        writeRecent(updated)
      }

      if (type === 'artist' && typeof value === 'string') {
        router.push(`/events?search=${encodeURIComponent(value)}`)
      } else if (type === 'venue' && typeof value === 'object') {
        const url = value.matchingEventId
          ? `/venues/${value.slug}?highlight=${value.matchingEventId}`
          : `/venues/${value.slug}`
        router.push(url)
      }
    },
    [query, recentSearches, router],
  )

  return {
    query,
    setQuery,
    clearQuery,
    recentSearches,
    popularEvents,
    artistResults,
    venueResults,
    isLoading,
    navigateTo,
  }
}
