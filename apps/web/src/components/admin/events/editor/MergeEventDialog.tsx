'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ApiError, apiClient } from '@/lib/api'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'
import { AdminButton } from '@/components/admin/primitives'

const COPY = ADMIN_COPY.editor.mergeDialog

interface SearchHit {
  id: string
  title: string
  artist: string | null
  date: string
  venueName: string | null
}

export interface MergeEventDialogProps {
  sourceId: string
  sourceTitle: string
  onCancel: () => void
  onMerged: (targetId: string) => void
}

const SEARCH_DEBOUNCE_MS = 220

export const MergeEventDialog = ({
  sourceId,
  sourceTitle,
  onCancel,
  onMerged,
}: MergeEventDialogProps) => {
  const { getToken } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [target, setTarget] = useState<SearchHit | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A generation counter so a slow search response can't overwrite the
  // results of a newer query.
  const generationRef = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2 || target) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    generationRef.current += 1
    const myGen = generationRef.current
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const token = await getToken()
          if (!token || myGen !== generationRef.current) return
          const rows = await apiClient.get<SearchHit[]>(
            `/v1/admin/events?query=${encodeURIComponent(trimmed)}&limit=10&offset=0`,
            token,
          )
          if (myGen !== generationRef.current) return
          setResults(rows)
        } catch (searchErr) {
          if (myGen !== generationRef.current) return
          console.error('MergeEventDialog search error:', searchErr)
          setResults([])
        } finally {
          if (myGen === generationRef.current) setSearching(false)
        }
      })()
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [query, getToken, target])

  const onConfirm = async () => {
    if (!target || pending) return
    setPending(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new ApiError(401, 'Unauthorized')
      await apiClient.post(`/v1/admin/events/${sourceId}/merge`, token, {
        targetId: target.id,
      })
      onMerged(target.id)
    } catch (mergeErr) {
      const message =
        mergeErr instanceof ApiError ? mergeErr.message : COPY.mergeFailed
      console.error('MergeEventDialog merge error:', mergeErr)
      setError(message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={COPY.heading}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(evt) => {
        if (pending) return
        if (evt.target === evt.currentTarget) onCancel()
      }}
    >
      <div
        style={{
          width: 560,
          maxWidth: '100%',
          maxHeight: '90vh',
          background: 'var(--bg-elevated)',
          borderTop: '3px solid var(--signal)',
          border: '1px solid var(--border-strong)',
          borderRadius: 14,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '22px 24px 14px' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--signal)',
            }}
          >
            {COPY.eyebrow}
          </div>
          <h3
            style={{
              margin: '9px 0 0',
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--fg)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            {COPY.heading}
          </h3>
          <div
            style={{
              marginTop: 12,
              fontSize: 13,
              color: 'var(--fg-muted)',
              lineHeight: 1.6,
            }}
          >
            {COPY.body}
          </div>
        </div>

        {!target ? (
          <div
            style={{
              padding: '0 24px 16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                color: 'var(--fg-muted)',
              }}
            >
              {COPY.searchLabel}
              <input
                value={query}
                onChange={(evt) => setQuery(evt.target.value)}
                placeholder={COPY.searchPlaceholder}
                aria-label={COPY.searchLabel}
                autoFocus
                style={{
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 9,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-1)',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  color: 'var(--fg)',
                }}
              />
            </label>
            {searching && (
              <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                {COPY.searchingHint}
              </div>
            )}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                {COPY.noResults}
              </div>
            )}
            {results.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                {COPY.resultsHint(results.length)}
              </div>
            )}
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {results.map((hit) => {
                const isSelf = hit.id === sourceId
                return (
                  <li key={hit.id}>
                    <button
                      type="button"
                      onClick={() => !isSelf && setTarget(hit)}
                      disabled={isSelf}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: 9,
                        border: '1px solid var(--border)',
                        background: isSelf ? 'transparent' : 'var(--surface-1)',
                        opacity: isSelf ? 0.5 : 1,
                        cursor: isSelf ? 'not-allowed' : 'pointer',
                        color: 'var(--fg)',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {hit.title}
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 12,
                          color: 'var(--fg-muted)',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {hit.venueName ?? '—'} · {hit.date}
                      </div>
                      {isSelf && (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 11,
                            color: 'var(--warning)',
                          }}
                        >
                          {COPY.sameEventDisallowed}
                        </div>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : (
          <div style={{ padding: '0 24px 16px' }}>
            <div
              style={{
                padding: '13px 14px',
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 9,
              }}
            >
              <div
                style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}
              >
                {COPY.previewHeading(sourceTitle, target.title)}
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--fg-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {target.venueName ?? '—'} · {target.date}
              </div>
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12.5,
                  color: 'var(--fg-muted)',
                  lineHeight: 1.6,
                }}
              >
                {COPY.previewBody}
              </div>
            </div>
            {error && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: 'var(--danger)',
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            background: 'var(--surface-1)',
          }}
        >
          {target ? (
            <>
              <AdminButton
                type="button"
                variant="ghost"
                onClick={() => setTarget(null)}
                disabled={pending}
              >
                {COPY.pickAnother}
              </AdminButton>
              <AdminButton
                type="button"
                variant="outline"
                onClick={onConfirm}
                disabled={pending}
              >
                {COPY.confirm}
              </AdminButton>
            </>
          ) : (
            <AdminButton
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={pending}
            >
              {COPY.cancel}
            </AdminButton>
          )}
        </div>
      </div>
    </div>
  )
}
