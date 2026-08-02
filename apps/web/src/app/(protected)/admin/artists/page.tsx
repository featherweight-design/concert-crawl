'use client'

// Admin match-review queue for the Spotify artist identity match (#1115,
// plan PR-C Task 9). Explicitly exempt from the design pipeline — a plain
// table on the existing admin primitives, nothing custom.

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  AdminButton,
  AdminTable,
  Panel,
  SectionHead,
  StatusBadge,
  TD,
  TH,
  THead,
  TR,
} from '@/components/admin/primitives'
import { ADMIN_COPY } from '@/components/admin/definitions/copy'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const COPY = ADMIN_COPY.artists

type MatchStatus = 'unmatched' | 'matched' | 'ambiguous' | 'no_match'

interface AdminArtist {
  id: string
  name: string
  canonicalName: string
  slug: string
  spotifyArtistId: string | null
  matchStatus: MatchStatus
  photoUrl: string | null
  matchCheckedAt: string | null
}

const STATUS_TABS: MatchStatus[] = [
  'ambiguous',
  'unmatched',
  'no_match',
  'matched',
]

const STATUS_KIND: Record<MatchStatus, 'warning' | 'success' | 'neutral'> = {
  ambiguous: 'warning',
  unmatched: 'neutral',
  no_match: 'neutral',
  matched: 'success',
}

export default function AdminArtistsPage() {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<MatchStatus>('ambiguous')
  const [rows, setRows] = useState<AdminArtist[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const resp = await fetch(
        `${API_BASE}/v1/admin/artists?status=${status}&limit=200`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!resp.ok) {
        setError(COPY.errorState)
        return
      }
      const body: { data: AdminArtist[] } = await resp.json()
      setRows(body.data)
    } catch (err) {
      console.error('[admin artists] load failed', err)
      setError(COPY.errorState)
    } finally {
      setIsLoading(false)
    }
  }, [getToken, status])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (id: string, spotifyArtistId: string | null) => {
    try {
      const token = await getToken()
      if (!token) return
      const resp = await fetch(`${API_BASE}/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spotifyArtistId }),
      })
      if (!resp.ok) {
        setError(COPY.saveError)
        return
      }
      // Drop the draft so the reloaded row wins. Without this, clearing a row
      // leaves the typed id in the input, still overriding the saved null.
      setDrafts((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([key]) => key !== id)),
      )
      await load()
    } catch (err) {
      console.error('[admin artists] save failed', err)
      setError(COPY.saveError)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHead
        eyebrow={COPY.eyebrow}
        title={COPY.title}
        subtitle={COPY.subtitle}
      />

      <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>
        {COPY.dormantNotice}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {STATUS_TABS.map((tab) => (
          <AdminButton
            key={tab}
            size="sm"
            variant={tab === status ? 'primary' : 'outline'}
            onClick={() => setStatus(tab)}
          >
            {COPY.statusChips[tab]}
          </AdminButton>
        ))}
      </div>

      {error !== null && (
        <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>
          {error}
        </p>
      )}

      <Panel padding={0}>
        {isLoading ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--fg-subtle)',
              fontSize: 13,
            }}
          >
            {COPY.loadingState}
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--fg-subtle)',
              fontSize: 13,
            }}
          >
            {COPY.emptyState}
          </div>
        ) : (
          <AdminTable minWidth={860}>
            <THead>
              <TR>
                <TH>{COPY.columns.name}</TH>
                <TH>{COPY.columns.canonicalName}</TH>
                <TH>{COPY.columns.status}</TH>
                <TH>{COPY.columns.spotifyArtistId}</TH>
                <TH>{COPY.columns.checkedAt}</TH>
                <TH align="right">{COPY.columns.actions}</TH>
              </TR>
            </THead>
            <tbody>
              {rows.map((row) => {
                const draft = drafts[row.id] ?? row.spotifyArtistId ?? ''
                return (
                  <TR key={row.id}>
                    <TD>{row.name}</TD>
                    <TD mono>{row.canonicalName}</TD>
                    <TD>
                      <StatusBadge kind={STATUS_KIND[row.matchStatus]}>
                        {COPY.statusChips[row.matchStatus]}
                      </StatusBadge>
                    </TD>
                    <TD>
                      <label
                        htmlFor={`spotify-id-${row.id}`}
                        style={{
                          position: 'absolute',
                          width: 1,
                          height: 1,
                          overflow: 'hidden',
                          clip: 'rect(0 0 0 0)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {COPY.idPlaceholder}
                      </label>
                      <input
                        id={`spotify-id-${row.id}`}
                        value={draft}
                        placeholder={COPY.idPlaceholder}
                        onChange={(ev) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.id]: ev.target.value,
                          }))
                        }
                        style={{
                          width: '100%',
                          minWidth: 200,
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
                    </TD>
                    <TD mono color="var(--fg-subtle)">
                      {row.matchCheckedAt === null
                        ? COPY.never
                        : new Date(row.matchCheckedAt).toLocaleDateString(
                            'en-US',
                            { timeZone: 'America/Denver' },
                          )}
                    </TD>
                    <TD align="right">
                      <div
                        style={{
                          display: 'inline-flex',
                          gap: 8,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <AdminButton
                          size="sm"
                          variant="primary"
                          disabled={draft.trim().length === 0}
                          onClick={() => void save(row.id, draft.trim())}
                        >
                          {COPY.save}
                        </AdminButton>
                        <AdminButton
                          size="sm"
                          variant="ghost"
                          disabled={row.spotifyArtistId === null}
                          onClick={() => void save(row.id, null)}
                        >
                          {COPY.clear}
                        </AdminButton>
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  )
}
