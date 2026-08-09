'use client'

// The pick-one list for the Spotify match queue (#1345). Exempt from the
// design pipeline, like the rest of admin.
//
// It owns its own fetch rather than lifting candidates into the page, because
// each search spends from the same app-token quota MATCH_BATCH_SIZE rations —
// scoping the request to the row the admin opened is what keeps it on-demand.
//
// Opening the picker sends no `query`, which is what makes the request a cache
// read (#1525): the match job already snapshotted this row's candidates, so
// the common case costs no Spotify search. Typing a term or hitting refresh is
// the explicit opt-in to spend one.

import { useCallback, useEffect, useState } from 'react'
import { AdminButton, StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { SafeExternalLink } from '@/components/admin/SafeExternalLink'

const COPY = ADMIN_COPY.artists

export interface SpotifyCandidate {
  id: string
  name: string
  imageUrl: string | null
  popularity: number | null
  /** `null` means Spotify was never asked, `[]` means it lists none. */
  genres: string[] | null
  spotifyUrl: string | null
  isExactMatch: boolean
}

interface CandidatePickerProps {
  artistId: string
  canonicalName: string
  apiBase: string
  getToken: () => Promise<string | null>
  onPick: (spotifyArtistId: string, photoUrl: string | null) => void
}

interface CandidatesResponse {
  success: boolean
  data?: SpotifyCandidate[]
  /**
   * When the row's snapshot was last fetched from Spotify. A cache read, a
   * canonical search and a refresh all carry it; genre hydration does not
   * move it, since it fills in a snapshot rather than taking a new one. Null
   * only for a hand-typed query, which is never cached.
   */
  cachedAt?: string | null
}

interface LoadOptions {
  /** Overrides the search term. Null reads the row's snapshot. */
  query?: string | null
  refresh?: boolean
}

export const CandidatePicker = ({
  artistId,
  canonicalName,
  apiBase,
  getToken,
  onPick,
}: CandidatePickerProps) => {
  const [candidates, setCandidates] = useState<SpotifyCandidate[]>([])
  const [term, setTerm] = useState(canonicalName)
  const [pastedId, setPastedId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cachedAt, setCachedAt] = useState<string | null>(null)

  const load = useCallback(
    async ({ query = null, refresh = false }: LoadOptions = {}) => {
      setIsLoading(true)
      setError(null)
      // Results from the previous term stay clickable otherwise, so an admin
      // can pick a candidate that does not belong to the search they are
      // looking at — the exact wrong-identity mistake this queue exists to
      // prevent.
      setCandidates([])
      setCachedAt(null)
      try {
        const token = await getToken()
        if (!token) {
          setError(COPY.candidatesError)
          return
        }
        const params = new URLSearchParams()
        if (query !== null) params.set('query', query)
        if (refresh) params.set('refresh', 'true')
        const search = params.toString()
        const resp = await fetch(
          `${apiBase}/v1/admin/artists/${artistId}/candidates${search === '' ? '' : `?${search}`}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!resp.ok) {
          // Every state an admin can act on gets its own message: wait,
          // provision credentials, or fix the credentials that exist. A shared
          // "could not search" would send them looking for the wrong problem.
          if (resp.status === 503) setError(COPY.candidatesDormant)
          else if (resp.status === 429) setError(COPY.candidatesRateLimited)
          else if (resp.status === 502)
            setError(COPY.candidatesCredentialsRejected)
          else setError(COPY.candidatesError)
          setCandidates([])
          return
        }
        const body: CandidatesResponse = await resp.json()
        setCandidates(body.data ?? [])
        setCachedAt(body.cachedAt ?? null)
      } catch (err) {
        console.error('[admin artists] candidate search failed', err)
        setError(COPY.candidatesError)
        setCandidates([])
      } finally {
        setIsLoading(false)
      }
    },
    [apiBase, artistId, getToken],
  )

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        onSubmit={(ev) => {
          ev.preventDefault()
          // Enter submits past the disabled button, and an empty term would
          // spend a Spotify search re-running the canonical one.
          const trimmed = term.trim()
          if (trimmed.length === 0) return
          // The box starts on the canonical name, so submitting it untouched
          // is a refresh. Sending it as an override would spend the same
          // search and throw the result away instead of caching it.
          void load(
            trimmed === canonicalName ? { refresh: true } : { query: trimmed },
          )
        }}
      >
        <label
          htmlFor={`candidate-search-${artistId}`}
          style={{ fontSize: 12 }}
        >
          {COPY.candidateSearchLabel}
        </label>
        <input
          id={`candidate-search-${artistId}`}
          value={term}
          onChange={(ev) => setTerm(ev.target.value)}
          style={{
            minWidth: 220,
            minHeight: 36,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg)',
            color: 'var(--fg)',
            fontSize: 13,
          }}
        />
        <AdminButton
          size="sm"
          variant="outline"
          type="submit"
          disabled={term.trim().length === 0}
        >
          {COPY.candidateSearch}
        </AdminButton>
      </form>

      {/* Shown whenever the list on screen is also the row's stored snapshot —
          a cache hit, a live canonical search, or a refresh. A snapshot can be
          as old as the row's last match-job pass and the artist may have
          changed their Spotify profile since, so this is the explicit, and
          only, way to spend a search on finding out. Hidden for a hand-typed
          query, which is never written back and so has nothing to date. */}
      {cachedAt !== null && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
            {COPY.candidatesCachedAt(new Date(cachedAt).toLocaleString())}
          </span>
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => void load({ refresh: true })}
            disabled={isLoading}
          >
            {COPY.candidatesRefresh}
          </AdminButton>
        </div>
      )}

      {isLoading && (
        <p style={{ fontSize: 13, color: 'var(--fg-subtle)', margin: 0 }}>
          {COPY.candidatesLoading}
        </p>
      )}

      {error !== null && (
        <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>
          {error}
        </p>
      )}

      {!isLoading && error === null && candidates.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--fg-subtle)', margin: 0 }}>
          {COPY.candidatesEmpty}
        </p>
      )}

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {candidates.map((candidate) => (
          <li
            key={candidate.id}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              padding: 10,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
            }}
          >
            {/* Next/Image is not used here: these are arbitrary Spotify CDN
                hosts on an admin-only surface, and adding each to
                images.remotePatterns is a config change per host. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={candidate.imageUrl ?? undefined}
              alt=""
              width={56}
              height={56}
              style={{
                width: 56,
                height: 56,
                borderRadius: 6,
                objectFit: 'cover',
                background: 'var(--bg-subtle)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <strong style={{ fontSize: 14 }}>{candidate.name}</strong>
                {/* On an ambiguous row these are exactly the candidates that
                    collided — the reason the matcher refused to guess. */}
                {candidate.isExactMatch && (
                  <StatusBadge kind="warning">
                    {COPY.exactMatchBadge}
                  </StatusBadge>
                )}
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--fg-subtle)',
                  margin: '4px 0 0',
                }}
              >
                {/* null is "we never got them", [] is "Spotify lists none" —
                    collapsing the two would tell an admin the artist has no
                    genres when hydration simply failed. */}
                {candidate.genres === null
                  ? COPY.genresUnknown
                  : candidate.genres.length > 0
                    ? candidate.genres.slice(0, 3).join(', ')
                    : COPY.noGenres}
                {candidate.popularity !== null &&
                  ` · ${COPY.popularity} ${candidate.popularity}`}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--fg-subtle)',
                  margin: '2px 0 0',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {candidate.id}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexShrink: 0,
                alignItems: 'center',
              }}
            >
              {candidate.spotifyUrl !== null && (
                <SafeExternalLink
                  href={candidate.spotifyUrl}
                  style={{ fontSize: 12, color: 'var(--accent)' }}
                >
                  {COPY.openInSpotify}
                </SafeExternalLink>
              )}
              <AdminButton
                size="sm"
                variant="primary"
                onClick={() => onPick(candidate.id, candidate.imageUrl)}
              >
                {COPY.useCandidate}
              </AdminButton>
            </div>
          </li>
        ))}
      </ul>

      {/* The paste-an-id escape hatch. It used to be a column on every table
          row, which the picker made redundant — but it is still the only way
          to resolve a row when Spotify search is dormant or returns the wrong
          artist, so it moves here rather than being deleted. */}
      <form
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        onSubmit={(ev) => {
          ev.preventDefault()
          if (pastedId.trim().length === 0) return
          // No photo: an id typed by hand has no image in hand, so the plate
          // fills in on the next match-job cycle.
          onPick(pastedId.trim(), null)
        }}
      >
        <label htmlFor={`paste-id-${artistId}`} style={{ fontSize: 12 }}>
          {COPY.pasteIdLabel}
        </label>
        <input
          id={`paste-id-${artistId}`}
          value={pastedId}
          placeholder={COPY.idPlaceholder}
          onChange={(ev) => setPastedId(ev.target.value)}
          style={{
            minWidth: 220,
            minHeight: 36,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg)',
            color: 'var(--fg)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
          }}
        />
        <AdminButton
          size="sm"
          variant="outline"
          type="submit"
          disabled={pastedId.trim().length === 0}
        >
          {COPY.save}
        </AdminButton>
      </form>
    </div>
  )
}
