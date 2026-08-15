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

type MatchStatus =
  'unmatched' | 'matched' | 'ambiguous' | 'no_match' | 'not_an_artist'

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

const STATUS_CHIPS: MatchStatus[] = [
  'ambiguous',
  'unmatched',
  'no_match',
  'matched',
  'not_an_artist',
]

const STATUS_KIND: Record<MatchStatus, 'warning' | 'success' | 'neutral'> = {
  ambiguous: 'warning',
  unmatched: 'neutral',
  no_match: 'neutral',
  matched: 'success',
  not_an_artist: 'neutral',
}

const PAGE_SIZE = 100

/**
 * Move one row between chip buckets.
 *
 * The counts come from their own endpoint, so a row resolved in place would
 * leave every chip a request behind until the next load. Walking the single
 * row that changed keeps them honest without a second round trip.
 */
const shiftCounts = (
  counts: Record<MatchStatus, number>,
  from: MatchStatus | undefined,
  to: MatchStatus,
): Record<MatchStatus, number> => {
  if (from === undefined || from === to) return counts
  const next = { ...counts }
  next[from] = Math.max(0, next[from] - 1)
  next[to] += 1
  return next
}

const EMPTY_COUNTS: Record<MatchStatus, number> = {
  ambiguous: 0,
  unmatched: 0,
  no_match: 0,
  matched: 0,
  not_an_artist: 0,
}

export default function AdminArtistsPage() {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<MatchStatus>('ambiguous')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] =
    useState<Record<MatchStatus, number>>(EMPTY_COUNTS)
  const [rows, setRows] = useState<AdminArtist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // One row at a time — every open picker spends a Spotify search.
  const [openCandidatesFor, setOpenCandidatesFor] = useState<string | null>(
    null,
  )

  // A keystroke per request would spend a query on every prefix of the name.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setOffset(0)
      setOpenCandidatesFor(null)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) {
        setError(COPY.errorState)
        return
      }
      const headers = { Authorization: `Bearer ${token}` }
      // The server ignores `status` whenever a search is present, so sending
      // both would misdescribe what comes back.
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        ...(search === '' ? { status } : { search }),
      })
      const [listResp, countsResp] = await Promise.all([
        fetch(`${API_BASE}/v1/admin/artists?${query.toString()}`, { headers }),
        fetch(`${API_BASE}/v1/admin/artists/counts`, { headers }),
      ])
      if (!listResp.ok || !countsResp.ok) {
        setError(COPY.errorState)
        return
      }
      const body: { data: AdminArtist[]; total: number } = await listResp.json()
      const countsBody: { data: Record<MatchStatus, number> } =
        await countsResp.json()
      setRows(body.data)
      setTotal(body.total)
      // Merged over the zeroed record rather than trusted whole: a staggered
      // deploy can serve counts that predate a status this build knows about,
      // and a missing key turns every later shift into NaN.
      setCounts({ ...EMPTY_COUNTS, ...countsBody.data })
    } catch (err) {
      console.error('[admin artists] load failed', err)
      setError(COPY.errorState)
    } finally {
      setIsLoading(false)
    }
  }, [getToken, status, search, offset])

  // A trailing page can empty under the admin — they resolved its last row, or
  // the server has nothing at this offset any more. Either way the page they
  // are on has stopped existing, so walk back one and let the offset change
  // refetch. Declared here rather than at each call site so every route into
  // an empty page is covered by one rule.
  useEffect(() => {
    if (!isLoading && rows.length === 0 && offset > 0) {
      setOffset((prev) => Math.max(0, prev - PAGE_SIZE))
    }
  }, [isLoading, rows.length, offset])

  useEffect(() => {
    void load()
  }, [load])

  // `photoUrl` is only passed when the id came from the candidate picker,
  // which already has the artist's image in hand. Sending it saves waiting a
  // full match-job cycle for the plate to fill in.
  //
  // Assigning an id moves the artist to `matched`, so on every other tab the
  // row leaves the queue the admin is looking at. Dropping it from local state
  // is both cheaper and calmer than refetching the table, which read as the
  // whole page refreshing under them. Clearing an id still reloads: the server
  // decides what status a cleared row lands in, and guessing it here would be
  // a lie.
  const save = async (
    id: string,
    spotifyArtistId: string | null,
    photoUrl?: string | null,
  ) => {
    const previousStatus = rows.find((row) => row.id === id)?.matchStatus
    try {
      const token = await getToken()
      if (!token) {
        setError(COPY.saveError)
        return
      }
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
      setError(null)
      if (spotifyArtistId === null) {
        await load()
        return
      }
      // On the `matched` chip the row was already matched and still is — the
      // admin is correcting a wrong identity, not resolving a queue. Dropping
      // it there would vanish the row they are working on. A search result is
      // the same case: the list is "everything named X", and the row still is.
      if (status === 'matched' || search !== '') {
        setRows((prev) =>
          prev.map((row) =>
            row.id === id
              ? {
                  ...row,
                  spotifyArtistId,
                  matchStatus: 'matched',
                  photoUrl: photoUrl ?? row.photoUrl,
                }
              : row,
          ),
        )
        setCounts((prev) => shiftCounts(prev, previousStatus, 'matched'))
        return
      }
      setCounts((prev) => shiftCounts(prev, previousStatus, 'matched'))
      // Functional, because a chip change or a debounced search can land a new
      // list while this PATCH is in flight; filtering the closed-over array
      // would put the stale page back.
      setRows((prev) => prev.filter((row) => row.id !== id))
      setTotal((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('[admin artists] save failed', err)
      setError(COPY.saveError)
    }
  }

  // The ruling that a row is not an act at all. It goes through the identity
  // PATCH because it *is* a match verdict — the other four answer "how
  // confident is the Spotify match?", and this one answers that there is
  // nothing here to match. Reloading rather than dropping the row locally: the
  // counts move too, and a stale chip is worse than a redraw.
  const markNotAnArtist = async (id: string) => {
    try {
      const token = await getToken()
      if (!token) {
        setError(COPY.saveError)
        return
      }
      const resp = await fetch(`${API_BASE}/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spotifyArtistId: null,
          matchStatus: 'not_an_artist',
        }),
      })
      if (!resp.ok) {
        setError(COPY.saveError)
        return
      }
      setError(null)
      // Same reason the chips and the pager clear it: a picker still open when
      // the list redraws mounts against a different row and spends a Spotify
      // search nobody asked for.
      setOpenCandidatesFor(null)
      await load()
    } catch (err) {
      console.error('[admin artists] not-an-artist failed', err)
      setError(COPY.saveError)
    }
  }

  // Visibility is its own endpoint, not a field on the identity PATCH above:
  // that body requires a spotifyArtistId, so hiding through it would mean
  // resending an identity just to take a page down (#1342).
  const setHidden = async (id: string, hidden: boolean) => {
    try {
      const token = await getToken()
      if (!token) {
        setError(COPY.visibilityError)
        return
      }
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

      <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>
        {COPY.notAnArtistHint}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {STATUS_CHIPS.map((chip) => (
          <AdminButton
            key={chip}
            size="sm"
            variant={chip === status && search === '' ? 'primary' : 'outline'}
            onClick={() => {
              // A picker left open on another chip reopens — and spends a fresh
              // Spotify search on mount — the moment the admin comes back.
              setOpenCandidatesFor(null)
              setStatus(chip)
              setOffset(0)
            }}
          >
            {COPY.statusChipCount(COPY.statusChips[chip], counts[chip])}
          </AdminButton>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          type="search"
          aria-label={COPY.searchLabel}
          placeholder={COPY.searchPlaceholder}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          style={{
            maxWidth: 360,
            height: 32,
            padding: '0 12px',
            borderRadius: 9,
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-1)',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'var(--fg)',
          }}
        />
        {search !== '' && (
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>
            {COPY.searchNotice}
          </p>
        )}
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
            {search === '' ? COPY.emptyState : COPY.noSearchResults}
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
                      {/* Read-only since #1345 gave every row a picker: an
                        editable id per row was a wide input the admin never
                        typed into. Pasting one by hand still works, inside the
                        picker, where it is the fallback rather than the
                        default. */}
                      <TD mono color="var(--fg-subtle)">
                        {row.spotifyArtistId ?? COPY.noSpotifyId}
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
                          {/* Already ruled on — offering it again invites a
                            double-click that writes the same verdict twice. */}
                          {row.matchStatus !== 'not_an_artist' && (
                            <AdminButton
                              size="sm"
                              variant="outline"
                              onClick={() => void markNotAnArtist(row.id)}
                            >
                              {COPY.notAnArtist}
                            </AdminButton>
                          )}
                          {/* On every row, not just the ambiguous chip: the
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

      {total > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'flex-end',
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
            {COPY.pageStatus(
              offset + 1,
              Math.min(offset + rows.length, total),
              total,
            )}
          </span>
          <AdminButton
            size="sm"
            variant="outline"
            disabled={offset === 0}
            onClick={() => {
              setOpenCandidatesFor(null)
              setOffset((current) => Math.max(0, current - PAGE_SIZE))
            }}
          >
            {COPY.prev}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="outline"
            disabled={offset + rows.length >= total}
            onClick={() => {
              setOpenCandidatesFor(null)
              setOffset((current) => current + PAGE_SIZE)
            }}
          >
            {COPY.next}
          </AdminButton>
        </div>
      )}
    </div>
  )
}
