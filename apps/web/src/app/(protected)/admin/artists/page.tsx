'use client'

// Admin match-review queue for the Spotify artist identity match (#1115,
// plan PR-C Task 9). Explicitly exempt from the design pipeline — a plain
// table on the existing admin primitives, nothing custom.

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
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

/**
 * A chip on this page. `exhausted` is not a match status — it says the job
 * stopped searching, which is a different question from what the last search
 * answered — but it is a queue the admin filters by, so the two share a type
 * here and nowhere else.
 */
type QueueFilter = MatchStatus | 'exhausted'

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
  isExhausted: boolean
}

/**
 * The row a write returns. Both PATCH endpoints answer with what they wrote,
 * which is what makes refetching unnecessary: the new bucket is known rather
 * than guessed.
 *
 * `isExhausted` is deliberately absent. The list query derives it, and
 * restating the rule here would be a second copy of it to keep in step with
 * the server. Each caller states the one thing it knows instead — the identity
 * PATCH resets the attempt counter to zero, and the visibility PATCH never
 * touches it.
 */
type PatchedArtist = Omit<AdminArtist, 'isExhausted'>

const STATUS_CHIPS: QueueFilter[] = [
  'ambiguous',
  'unmatched',
  'no_match',
  'matched',
  'not_an_artist',
  'exhausted',
]

/** The chip a row is listed under, which outranks its match status. */
const bucketOf = (row: AdminArtist): QueueFilter =>
  row.isExhausted ? 'exhausted' : row.matchStatus

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
  counts: Record<QueueFilter, number>,
  from: QueueFilter | undefined,
  to: QueueFilter,
): Record<QueueFilter, number> => {
  if (from === undefined || from === to) return counts
  const next = { ...counts }
  next[from] = Math.max(0, next[from] - 1)
  next[to] += 1
  return next
}

const EMPTY_COUNTS: Record<QueueFilter, number> = {
  ambiguous: 0,
  unmatched: 0,
  no_match: 0,
  matched: 0,
  not_an_artist: 0,
  exhausted: 0,
}

export default function AdminArtistsPage() {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<QueueFilter>('ambiguous')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  // On by default, matching the API. Most derived artists last played months
  // ago, and a queue counting them is a queue nobody can finish.
  const [upcomingOnly, setUpcomingOnly] = useState(true)
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] =
    useState<Record<QueueFilter, number>>(EMPTY_COUNTS)
  const [rows, setRows] = useState<AdminArtist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // One row at a time — every open picker spends a Spotify search.
  const [openCandidatesFor, setOpenCandidatesFor] = useState<string | null>(
    null,
  )
  // Bumped whenever a load lands. A write compares the value it was issued
  // under against this one to tell whether the list it is folding into is
  // still the list it was looking at. See `applyWrite`.
  const loadGeneration = useRef(0)

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
      //
      // It ignores `upcoming` on a search too — but only on the list, since
      // `/counts` has no search to bypass it. Sending the ticked value during a
      // search would leave the chips counting a filter the table below them is
      // not applying, so the search forces it off for both.
      const upcomingParam = String(search === '' && upcomingOnly)
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        upcoming: upcomingParam,
        ...(search === '' ? { status } : { search }),
      })
      // The counts take the same `upcoming` value as the list, so a chip never
      // promises rows the table it opens cannot show.
      const countsQuery = new URLSearchParams({ upcoming: upcomingParam })
      const [listResp, countsResp] = await Promise.all([
        fetch(`${API_BASE}/v1/admin/artists?${query.toString()}`, { headers }),
        fetch(`${API_BASE}/v1/admin/artists/counts?${countsQuery.toString()}`, {
          headers,
        }),
      ])
      if (!listResp.ok || !countsResp.ok) {
        setError(COPY.errorState)
        return
      }
      const body: { data: AdminArtist[]; total: number } = await listResp.json()
      const countsBody: { data: Record<QueueFilter, number> } =
        await countsResp.json()
      setRows(body.data)
      setTotal(body.total)
      // Merged over the zeroed record rather than trusted whole: a staggered
      // deploy can serve counts that predate a status this build knows about,
      // and a missing key turns every later shift into NaN.
      setCounts({ ...EMPTY_COUNTS, ...countsBody.data })
      loadGeneration.current += 1
    } catch (err) {
      console.error('[admin artists] load failed', err)
      setError(COPY.errorState)
    } finally {
      setIsLoading(false)
    }
  }, [getToken, status, search, offset, upcomingOnly])

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

  /**
   * Fold a written row back into the list without refetching.
   *
   * Every write on this page used to end in `load()`, which sets `isLoading`
   * and swaps the whole table for the loading panel. To an admin who pressed
   * one button on one row, that reads as the page reloading under them — and
   * it also drops their scroll position and costs two requests. Since both
   * PATCH endpoints return the row they wrote, none of that is necessary.
   *
   * A row leaves the list when its bucket stops matching the chip in view.
   * During a search nothing leaves: the list is "everything named X", and a row
   * the admin just edited still is.
   *
   * Dropped entirely if a load landed while the PATCH was in flight. That load
   * fetched its rows and its counts in one round trip, so it is already a
   * self-consistent picture — and one that may well have read the write back
   * from the server. Shifting on top of it would count the same transition
   * twice and leave every chip one out.
   */
  const applyWrite = useCallback(
    (
      previous: AdminArtist,
      patched: PatchedArtist,
      isExhausted: boolean,
      generation: number,
    ) => {
      if (generation !== loadGeneration.current) return
      const next: AdminArtist = { ...previous, ...patched, isExhausted }
      const nextBucket = bucketOf(next)
      setCounts((prev) => shiftCounts(prev, bucketOf(previous), nextBucket))
      if (search !== '' || nextBucket === status) {
        // Functional, because a chip change or a debounced search can land a
        // new list while the PATCH is in flight; mapping the closed-over array
        // would put the stale page back.
        setRows((prev) => prev.map((row) => (row.id === next.id ? next : row)))
        return
      }
      // Only once the row is actually leaving. A picker still mounted against
      // it would reopen on whatever row takes its place and spend a Spotify
      // search nobody asked for — but a row that stays keeps its picker, since
      // closing it would undo work the admin is mid-way through.
      setOpenCandidatesFor((current) => (current === next.id ? null : current))
      setRows((prev) => prev.filter((row) => row.id !== next.id))
      setTotal((prev) => Math.max(0, prev - 1))
    },
    [search, status],
  )

  // `photoUrl` is only passed when the id came from the candidate picker,
  // which already has the artist's image in hand. Sending it saves waiting a
  // full match-job cycle for the plate to fill in.
  //
  // Clearing an id used to refetch, on the grounds that the server decides
  // what status a cleared row lands in and guessing it here would be a lie.
  // That was the right objection to guessing and the wrong remedy: the
  // response carries the status the server chose, so it can be read rather
  // than either guessed or refetched.
  //
  // Takes the row rather than its id: every call site renders from `rows` and
  // so already holds it, and `applyWrite` needs the bucket it is leaving.
  const save = async (
    previous: AdminArtist,
    spotifyArtistId: string | null,
    photoUrl?: string | null,
  ) => {
    // Read before the round trip: it is the list this write was issued
    // against, and only that list can safely receive it.
    const generation = loadGeneration.current
    try {
      const token = await getToken()
      if (!token) {
        setError(COPY.saveError)
        return
      }
      const resp = await fetch(`${API_BASE}/v1/admin/artists/${previous.id}`, {
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
      const body: { data: PatchedArtist } = await resp.json()
      // A row the admin has just ruled on is no longer one the job gave up on:
      // the PATCH resets the attempt counter, so it must not still read as
      // given up.
      applyWrite(previous, body.data, false, generation)
    } catch (err) {
      console.error('[admin artists] save failed', err)
      setError(COPY.saveError)
    }
  }

  // The ruling that a row is not an act at all. It goes through the identity
  // PATCH because it *is* a match verdict — the other four answer "how
  // confident is the Spotify match?", and this one answers that there is
  // nothing here to match.
  //
  // It used to refetch so the chips could not go stale, which is the concern
  // that mattered and the redraw that did not: `applyWrite` moves the row and
  // its two counts together, so the chips stay honest without the table
  // blanking.
  const markNotAnArtist = async (previous: AdminArtist) => {
    const generation = loadGeneration.current
    try {
      const token = await getToken()
      if (!token) {
        setError(COPY.saveError)
        return
      }
      const resp = await fetch(`${API_BASE}/v1/admin/artists/${previous.id}`, {
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
      const body: { data: PatchedArtist } = await resp.json()
      // `not_an_artist` is not an exhaustible status, and the PATCH zeroes the
      // counter regardless, so the row cannot land in the given-up bucket.
      applyWrite(previous, body.data, false, generation)
    } catch (err) {
      console.error('[admin artists] not-an-artist failed', err)
      setError(COPY.saveError)
    }
  }

  // Visibility is its own endpoint, not a field on the identity PATCH above:
  // that body requires a spotifyArtistId, so hiding through it would mean
  // resending an identity just to take a page down (#1342).
  //
  // This one never moves a row between chips — visibility is orthogonal to the
  // match state, and `hidden` is an artist column that no chip and no count
  // reads. So the refetch it used to do could not have been correcting
  // anything; it only redrew the table to flip one badge.
  const setHidden = async (previous: AdminArtist, hidden: boolean) => {
    const generation = loadGeneration.current
    try {
      const token = await getToken()
      if (!token) {
        setError(COPY.visibilityError)
        return
      }
      const resp = await fetch(
        `${API_BASE}/v1/admin/artists/${previous.id}/visibility`,
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
      setError(null)
      const body: { data: PatchedArtist } = await resp.json()
      // The visibility PATCH does not touch the attempt counter, so whatever
      // the row was given up on stays true.
      applyWrite(previous, body.data, previous.isExhausted, generation)
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

      {status === 'exhausted' && search === '' && (
        <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>
          {COPY.exhaustedNotice}
        </p>
      )}

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--fg)',
          }}
        >
          <input
            type="checkbox"
            // A search bypasses the filter, so leaving this live would offer a
            // control that changes nothing — which reads as broken.
            checked={search === '' && upcomingOnly}
            disabled={search !== ''}
            onChange={(event) => {
              setOpenCandidatesFor(null)
              setUpcomingOnly(event.target.checked)
              setOffset(0)
            }}
          />
          {COPY.upcomingLabel}
        </label>
        {search === '' && upcomingOnly && (
          <p style={{ fontSize: 12, color: 'var(--fg-subtle)', margin: 0 }}>
            {COPY.upcomingNotice}
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
                            onClick={() => void save(row, null)}
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
                              onClick={() => void markNotAnArtist(row)}
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
                            onClick={() => void setHidden(row, !row.hidden)}
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
                              void save(row, spotifyArtistId, photoUrl)
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
