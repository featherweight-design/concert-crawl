'use client'

// Admin match-review queue for the Spotify artist identity match (#1115,
// plan PR-C Task 9). Explicitly exempt from the design pipeline — a plain
// table on the existing admin primitives, nothing custom.

import { Fragment, useCallback, useEffect, useState } from 'react'
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
import { CandidatePicker } from '@/components/admin/artists/CandidatePicker'

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
  hidden: boolean
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
  // One row at a time — every open picker spends a Spotify search.
  const [openCandidatesFor, setOpenCandidatesFor] = useState<string | null>(
    null,
  )

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

  // `photoUrl` is only passed when the id came from the candidate picker,
  // which already has the artist's image in hand. Sending it saves waiting a
  // full match-job cycle for the plate to fill in.
  const save = async (
    id: string,
    spotifyArtistId: string | null,
    photoUrl?: string | null,
  ) => {
    try {
      const token = await getToken()
      if (!token) return
      const resp = await fetch(`${API_BASE}/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          photoUrl === undefined
            ? { spotifyArtistId }
            : { spotifyArtistId, photoUrl },
        ),
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

  // Visibility is its own endpoint, not a field on the identity PATCH above:
  // that body requires a spotifyArtistId, so hiding through it would mean
  // resending an identity just to take a page down (#1342).
  const setHidden = async (id: string, hidden: boolean) => {
    try {
      const token = await getToken()
      if (!token) return
      const resp = await fetch(
        `${API_BASE}/v1/admin/artists/${id}/visibility`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hidden }),
        },
      )
      if (!resp.ok) {
        setError(COPY.visibilityError)
        return
      }
      await load()
    } catch (err) {
      console.error('[admin artists] visibility change failed', err)
      setError(COPY.visibilityError)
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
                  <Fragment key={row.id}>
                    <TR>
                      <TD>{row.name}</TD>
                      <TD mono>{row.canonicalName}</TD>
                      <TD>
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <StatusBadge kind={STATUS_KIND[row.matchStatus]}>
                            {COPY.statusChips[row.matchStatus]}
                          </StatusBadge>
                          {/* Visibility is orthogonal to the match state, so it
                            reads as a second badge rather than replacing the
                            first — a hidden row is still matched or not. */}
                          {row.hidden && (
                            <StatusBadge kind="warning">
                              {COPY.hiddenBadge}
                            </StatusBadge>
                          )}
                        </div>
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
                          {/* On every row, including `matched`: a matched row can
                            still be matched to the wrong artist, and this is
                            the only way to see the alternatives. */}
                          <AdminButton
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setOpenCandidatesFor((current) =>
                                current === row.id ? null : row.id,
                              )
                            }
                          >
                            {openCandidatesFor === row.id
                              ? COPY.hideCandidates
                              : COPY.findOnSpotify}
                          </AdminButton>
                          {/* On every row, not just the ambiguous tab: the
                            festival packages that motivated this land in
                            no_match. */}
                          <AdminButton
                            size="sm"
                            variant="outline"
                            onClick={() => void setHidden(row.id, !row.hidden)}
                          >
                            {row.hidden ? COPY.restore : COPY.hide}
                          </AdminButton>
                        </div>
                      </TD>
                    </TR>
                    {openCandidatesFor === row.id && (
                      <TR>
                        <TD colSpan={6}>
                          <CandidatePicker
                            artistId={row.id}
                            canonicalName={row.canonicalName}
                            apiBase={API_BASE}
                            getToken={getToken}
                            onPick={(spotifyArtistId, photoUrl) => {
                              setOpenCandidatesFor(null)
                              void save(row.id, spotifyArtistId, photoUrl)
                            }}
                          />
                        </TD>
                      </TR>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </AdminTable>
        )}
      </Panel>
    </div>
  )
}
