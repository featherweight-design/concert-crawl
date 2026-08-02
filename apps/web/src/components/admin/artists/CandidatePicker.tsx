'use client'

// The pick-one list for the Spotify match queue (#1345). Exempt from the
// design pipeline, like the rest of admin.
//
// It owns its own fetch rather than lifting candidates into the page, because
// each search spends from the same app-token quota MATCH_BATCH_SIZE rations —
// scoping the request to the row the admin opened is what keeps it on-demand.

import { useCallback, useEffect, useState } from 'react'
import { AdminButton, StatusBadge } from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const COPY = ADMIN_COPY.artists

export interface SpotifyCandidate {
  id: string
  name: string
  images: { url: string }[]
  popularity: number | null
  genres: string[]
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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(
    async (query: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = await getToken()
        if (!token) return
        const resp = await fetch(
          `${apiBase}/v1/admin/artists/${artistId}/candidates?query=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!resp.ok) {
          // The two states an admin can act on get their own message: one says
          // "wait", the other says "stop and provision credentials". A shared
          // "could not search" would send them looking for the wrong problem.
          if (resp.status === 503) setError(COPY.candidatesDormant)
          else if (resp.status === 429) setError(COPY.candidatesRateLimited)
          else setError(COPY.candidatesError)
          setCandidates([])
          return
        }
        const body: CandidatesResponse = await resp.json()
        setCandidates(body.data ?? [])
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
    void search(canonicalName)
  }, [search, canonicalName])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <form
        style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        onSubmit={(ev) => {
          ev.preventDefault()
          void search(term)
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
              src={candidate.images[0]?.url}
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
                {candidate.genres.length > 0
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
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {candidate.spotifyUrl !== null && (
                <a
                  href={candidate.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: 'var(--accent)' }}
                >
                  {COPY.openInSpotify}
                </a>
              )}
              <AdminButton
                size="sm"
                variant="primary"
                onClick={() =>
                  onPick(candidate.id, candidate.images[0]?.url ?? null)
                }
              >
                {COPY.useCandidate}
              </AdminButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
