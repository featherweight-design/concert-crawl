/**
 * Resolves `ambiguous` rows in the `artists` projection using MusicBrainz.
 *
 * A row is `ambiguous` when more than one Spotify artist matched the canonical
 * name exactly, so the match job refused to guess (#1115). That queue runs to
 * hundreds of rows and no human is going to work through it by hand.
 *
 * MusicBrainz is the tiebreaker because it is a curated identity database
 * rather than a search index: an artist has one entry, and that entry carries
 * the artist's own streaming links. If exactly one MusicBrainz artist bears the
 * name and its page links exactly one Spotify artist, that is an editorial
 * answer to the question our search could only answer with a list.
 *
 * **The cross-check is the whole safety property.** A MusicBrainz name match is
 * accepted only when the Spotify ID it points at is already one of the
 * candidates our own Spotify search snapshotted for that row. Both sources have
 * to independently name the same artist. Without it we would be trusting a
 * name match on precisely the names we already know are ambiguous, and the cost
 * of being wrong is a stranger's press photo on a public artist page. That
 * limits the reachable set to rows carrying a `spotifyCandidates` snapshot —
 * rows matched before snapshotting existed need the match job to run again
 * before this script can say anything about them.
 *
 * Resolution is recorded the way the admin picker records a hand-resolution
 * (`apps/api/src/routes/admin/artists.ts`): `matchConfidence` stays null
 * because no algorithm scored this, and the cached photo is cleared so the
 * photo job re-fetches against the identity we just settled on.
 *
 * **The other half of the answer is the queue it empties.** Resolution is rare —
 * a pass agrees on roughly one row in fifty. What MusicBrainz supplies far more
 * often is a *verdict of genuine ambiguity*: when several MusicBrainz artists
 * bear the name exactly, a curated identity database and a search index have
 * independently said the name maps to more than one act. Re-asking Spotify
 * cannot break that, because the tie is a property of the catalogue rather than
 * of the question. Those rows have their match budget spent (`MATCH_ATTEMPT_LIMIT`),
 * which is what the admin queue reads to move a row out of `ambiguous` and into
 * its `exhausted` tab. The row keeps its candidates and its public page; it
 * simply stops being offered as work the job might finish.
 *
 * Only that one skip reason spends the budget. `no-exact-name-match` is absence
 * of evidence — MusicBrainz not knowing the artist says nothing about whether
 * Spotify's tie will break later. `no-spotify-link` and `several-spotify-links`
 * both mean the missing piece is a link an editor can add any day, so the row
 * is still worth re-asking.
 *
 * Deliberately a one-off, not a cron. The queue is a backlog with a floor —
 * once it is drained, new ambiguity arrives a few rows at a time and the admin
 * picker is the right surface for it. Re-running is safe, idempotent, and does
 * not re-buy what it already paid for: a resolved row is no longer `ambiguous`,
 * and an exhausted one is excluded by the same spent budget the admin queue
 * reads, so each pass only walks rows it has never given a verdict on.
 *
 * MusicBrainz asks for one request per second and a User-Agent that identifies
 * the application with a contact address. Both are honoured below. Two requests
 * are spent per row, each preceded by the full interval, so a row costs roughly
 * twice `requestIntervalMs` before retries. The run reports its own counts, so
 * the size of a pass is read from its output rather than guessed from here.
 */

import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm'
import { z } from 'zod'
import { canonicalizeArtist } from '@concert-crawl/types'
import { artists, MATCH_ATTEMPT_LIMIT } from '../schema/artists.js'
import type { Database } from '../client.js'

/** Why a row was left alone. Counted so a run reports where the queue actually goes. */
export type SkipReason =
  | 'no-exact-name-match'
  | 'several-exact-name-matches'
  | 'no-spotify-link'
  | 'several-spotify-links'
  | 'spotify-id-not-among-candidates'
  | 'musicbrainz-unavailable'

export interface MusicBrainzResolution {
  artistId: string
  name: string
  musicbrainzId: string
  spotifyArtistId: string
}

export interface MusicBrainzDisambiguateResult {
  /** Ambiguous rows examined this run. */
  considered: number
  /** Rows both sources agreed on. */
  resolved: number
  /**
   * Rows actually written. Zero on a dry run, and short of `resolved` when an
   * admin resolved a row by hand while this run was walking the queue — the
   * write is guarded on `ambiguous`, so the human's answer wins.
   */
  updated: number
  /** One entry per skip reason, so a run says where the queue went. */
  skipped: Record<SkipReason, number>
  /** Every agreement reached, for eyeballing before an apply run. */
  resolutions: MusicBrainzResolution[]
  /**
   * Rows whose match budget this run spent because MusicBrainz found the name
   * ambiguous too. Zero on a dry run, and short of the
   * `several-exact-name-matches` count when a row was already exhausted or had
   * left `ambiguous` before the write.
   */
  exhausted: number
}

export interface MusicBrainzDisambiguateOptions {
  dryRun: boolean
  /** Cap on rows examined. Left undefined, the whole ambiguous queue is walked. */
  limit?: number | undefined
  /**
   * MusicBrainz's published rate limit is one request per second. The default
   * leaves headroom above it rather than racing the limiter — a 503 costs a
   * retry, which is slower than simply waiting.
   */
  requestIntervalMs?: number
  fetchImpl?: typeof fetch
  sleepImpl?: (ms: number) => Promise<void>
}

const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2'

/**
 * MusicBrainz requires a User-Agent naming the application and a contact. The
 * contact is an address rather than the crawler's `+https://concertcrawl.app/bot`
 * URL because that URL does not resolve to anything a human can read.
 *
 * The spaces inside the parentheses are MusicBrainz's own documented shape
 * (`Application/Version ( contact )`), not stray formatting.
 */
const USER_AGENT =
  'ConcertCrawl/1.0 ( hugh@featherweight.design ) +https://concertcrawl.app'

const DEFAULT_REQUEST_INTERVAL_MS = 1100

/** Search hits past this rank are noise; an exact name match ranks far higher. */
const SEARCH_LIMIT = 25

/** 503 is MusicBrainz's rate-limit response and is documented as retryable. */
const MAX_RETRIES = 3

/**
 * A stalled connection would otherwise wedge the whole run, since nothing above
 * this loop is watching the clock. Bounding the request turns a hung socket
 * into one skipped row, which is the same outcome as any other failure here.
 */
const REQUEST_TIMEOUT_MS = 15_000

const searchResponseSchema = z.object({
  artists: z.array(z.object({ id: z.string(), name: z.string() })).default([]),
})

const lookupResponseSchema = z.object({
  relations: z
    .array(z.object({ url: z.object({ resource: z.string() }).optional() }))
    .default([]),
})

/**
 * Spotify artist URLs as MusicBrainz stores them. The optional `intl-<lang>`
 * segment appears on links copied from a localised Spotify client.
 */
const SPOTIFY_ARTIST_URL =
  /^https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?artist\/([A-Za-z0-9]+)/

/**
 * Escapes the two characters Lucene treats as structural inside a quoted
 * phrase. Band names carry every other metacharacter freely — "P!nk", "AC/DC",
 * "$UICIDEBOY$" — but a quoted phrase neutralises those, so only the quote
 * itself and its escape need handling.
 */
const escapeLucenePhrase = (name: string): string =>
  name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

interface RequestContext {
  fetchImpl: typeof fetch
  sleepImpl: (ms: number) => Promise<void>
  intervalMs: number
}

/**
 * One rate-limited GET, retried on 503.
 *
 * Returns `null` rather than throwing when MusicBrainz cannot answer: a single
 * unreachable artist should cost that row, not the rest of the run.
 */
async function getJson(
  url: string,
  ctx: RequestContext,
): Promise<unknown | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await ctx.sleepImpl(ctx.intervalMs)
    try {
      const response = await ctx.fetchImpl(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (response.status === 503) continue
      if (!response.ok) {
        // Without this the row is only ever reported as `musicbrainz-unavailable`,
        // which reads the same whether MusicBrainz is down or we are being refused.
        console.warn('[musicbrainz] request rejected', {
          url,
          status: response.status,
        })
        return null
      }
      return await response.json()
    } catch (err: unknown) {
      console.warn('[musicbrainz] request failed', { url, err })
    }
  }
  return null
}

/**
 * The MusicBrainz artist whose name canonicalizes to `canonicalName`, when
 * exactly one does.
 *
 * Compared through `canonicalizeArtist` rather than raw so the two sides agree
 * on diacritics and casing — the row holds `sigur ros` and MusicBrainz holds
 * `Sigur Rós`. Anything other than exactly one hit is a skip: zero means
 * MusicBrainz does not know the name, and several means MusicBrainz finds it
 * as ambiguous as Spotify did, which is not a tiebreak.
 */
function soleExactMatch(
  hits: { id: string; name: string }[],
  canonicalName: string,
): { id: string; name: string } | 'none' | 'several' {
  const exact = hits.filter(
    (hit) => canonicalizeArtist(hit.name) === canonicalName,
  )
  if (exact.length === 0) return 'none'
  if (exact.length > 1) return 'several'
  return exact[0]!
}

/**
 * Distinct Spotify artist IDs linked from a MusicBrainz artist's relations.
 *
 * Every URL relation is read rather than only the `free streaming` type.
 * Editors file Spotify under `free streaming`, `streaming` and occasionally
 * `stream for free` depending on when the link was added, and the URL shape is
 * a stronger signal than the label. The candidate cross-check downstream is
 * what makes this safe to be liberal about.
 */
function spotifyIdsFrom(
  relations: { url?: { resource: string } | undefined }[],
): string[] {
  const ids = new Set<string>()
  for (const relation of relations) {
    const match = relation.url?.resource.match(SPOTIFY_ARTIST_URL)
    if (match?.[1]) ids.add(match[1])
  }
  return [...ids]
}

export async function disambiguateArtistsWithMusicBrainz(
  database: Database,
  options: MusicBrainzDisambiguateOptions,
): Promise<MusicBrainzDisambiguateResult> {
  const ctx: RequestContext = {
    fetchImpl: options.fetchImpl ?? fetch,
    sleepImpl: options.sleepImpl ?? defaultSleep,
    intervalMs: options.requestIntervalMs ?? DEFAULT_REQUEST_INTERVAL_MS,
  }

  const skipped: Record<SkipReason, number> = {
    'no-exact-name-match': 0,
    'several-exact-name-matches': 0,
    'no-spotify-link': 0,
    'several-spotify-links': 0,
    'spotify-id-not-among-candidates': 0,
    'musicbrainz-unavailable': 0,
  }
  const resolutions: MusicBrainzResolution[] = []
  /** Rows MusicBrainz independently found ambiguous — see the header note. */
  const exhaustibleIds: string[] = []

  // Only rows carrying a candidate snapshot are reachable — the cross-check
  // has nothing to compare against without one. Ordered by name so a run
  // truncated by --limit resumes predictably rather than re-walking a random
  // slice.
  //
  // A spent budget drops the row out: this run's own exhaustion writes leave
  // rows `ambiguous`, so without the filter a second pass would re-buy the same
  // verdict two requests at a time. It also aligns the selection with the admin
  // queue, which already hides exhausted rows from its `ambiguous` tab.
  const selection = database
    .select({
      id: artists.id,
      name: artists.name,
      canonicalName: artists.canonicalName,
      spotifyCandidates: artists.spotifyCandidates,
    })
    .from(artists)
    .where(
      and(
        eq(artists.matchStatus, 'ambiguous'),
        isNotNull(artists.spotifyCandidates),
        lt(artists.matchAttempts, MATCH_ATTEMPT_LIMIT),
      ),
    )
    .orderBy(artists.canonicalName)

  const rows = await (options.limit === undefined
    ? selection
    : selection.limit(options.limit))

  for (const row of rows) {
    const query = `artist:"${escapeLucenePhrase(row.name)}"`
    const searchUrl = `${MUSICBRAINZ_BASE}/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=${SEARCH_LIMIT}`
    const searchBody = await getJson(searchUrl, ctx)
    const search = searchResponseSchema.safeParse(searchBody)
    if (!search.success) {
      skipped['musicbrainz-unavailable']++
      continue
    }

    const sole = soleExactMatch(search.data.artists, row.canonicalName)
    if (sole === 'none') {
      skipped['no-exact-name-match']++
      continue
    }
    if (sole === 'several') {
      skipped['several-exact-name-matches']++
      exhaustibleIds.push(row.id)
      continue
    }

    const lookupUrl = `${MUSICBRAINZ_BASE}/artist/${sole.id}?inc=url-rels&fmt=json`
    const lookupBody = await getJson(lookupUrl, ctx)
    const lookup = lookupResponseSchema.safeParse(lookupBody)
    if (!lookup.success) {
      skipped['musicbrainz-unavailable']++
      continue
    }

    const spotifyIds = spotifyIdsFrom(lookup.data.relations)
    if (spotifyIds.length === 0) {
      skipped['no-spotify-link']++
      continue
    }
    if (spotifyIds.length > 1) {
      skipped['several-spotify-links']++
      continue
    }

    const spotifyArtistId = spotifyIds[0]!
    const candidateIds = (row.spotifyCandidates ?? []).map(
      (candidate) => candidate.id,
    )
    if (!candidateIds.includes(spotifyArtistId)) {
      skipped['spotify-id-not-among-candidates']++
      continue
    }

    resolutions.push({
      artistId: row.id,
      name: row.name,
      musicbrainzId: sole.id,
      spotifyArtistId,
    })
  }

  if (options.dryRun) {
    return {
      considered: rows.length,
      resolved: resolutions.length,
      updated: 0,
      skipped,
      resolutions,
      exhausted: 0,
    }
  }

  // Guarded on `ambiguous` for the same reason the resolution write is — a row
  // an admin settled mid-run keeps the human's answer — and on a budget still
  // unspent so a re-run reports only the rows it actually changed.
  const exhaustedRows =
    exhaustibleIds.length === 0
      ? []
      : await database
          .update(artists)
          .set({
            matchAttempts: MATCH_ATTEMPT_LIMIT,
            matchCheckedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              inArray(artists.id, exhaustibleIds),
              eq(artists.matchStatus, 'ambiguous'),
              lt(artists.matchAttempts, MATCH_ATTEMPT_LIMIT),
            ),
          )
          .returning({ id: artists.id })

  let updated = 0
  for (const resolution of resolutions) {
    // Guarded on `ambiguous` so a row an admin resolved while this run was
    // walking the queue keeps the human's answer.
    const written = await database
      .update(artists)
      .set({
        spotifyArtistId: resolution.spotifyArtistId,
        matchStatus: 'matched',
        matchConfidence: null,
        matchCheckedAt: new Date(),
        // A resolution is a match, so it clears the budget the same way the
        // job's own match does. Leaving a spent counter behind would file the
        // row straight back into the admin's `exhausted` queue if it ever
        // returned to an unresolved status.
        matchAttempts: 0,
        photoUrl: null,
        photoFetchedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(artists.id, resolution.artistId),
          eq(artists.matchStatus, 'ambiguous'),
        ),
      )
      .returning({ id: artists.id })
    updated += written.length
  }

  return {
    considered: rows.length,
    resolved: resolutions.length,
    updated,
    skipped,
    resolutions,
    exhausted: exhaustedRows.length,
  }
}
