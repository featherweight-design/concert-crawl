// Integration tests for the admin artist match-review endpoints (#1115, plan
// PR-C Task 9, Step 25). Auth is stubbed at the Clerk boundary; the DB and the
// audit-log write are real.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { and, eq } from 'drizzle-orm'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_ctx: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { artists, auditLog, events, venues } from '@concert-crawl/db'
import { createApp } from '../../app.js'
import { testDb } from '../../test/helpers/db.js'
import { seedEvent, seedVenue } from '../../test/helpers/seed.js'
import { MATCH_ATTEMPT_LIMIT } from '../../lib/artist-exhaustion.js'

const app = createApp()

const ADMIN_HEADERS = {
  Authorization: 'Bearer admin-token',
  'Content-Type': 'application/json',
}

const setAdminAuth = (): void => {
  authState.current = {
    userId: 'admin_artist_test',
    sessionClaims: { metadata: { role: 'admin' } },
  }
}

const seedArtist = async (
  values: Partial<typeof artists.$inferInsert> & { canonicalName: string },
): Promise<string> => {
  const [row] = await testDb
    .insert(artists)
    .values({
      name: values.canonicalName,
      slug: values.canonicalName.replace(/[^a-z0-9]+/g, '-'),
      ...values,
    })
    .returning({ id: artists.id })
  if (!row) throw new Error('seed failed')
  return row.id
}

describe('admin artists routes', () => {
  beforeEach(async () => {
    await testDb
      .delete(auditLog)
      .where(eq(auditLog.actorId, 'admin_artist_test'))
    // Events before venues — the FK points that way. Both are cleared because
    // the list now joins through them, so a leftover show from another test
    // decides whether an artist is listed.
    await testDb.delete(events)
    await testDb.delete(venues)
    await testDb.delete(artists)
    setAdminAuth()
  })

  describe('GET /v1/admin/artists', () => {
    it('filters to the ambiguous review queue', async () => {
      await seedArtist({ canonicalName: 'nirvana', matchStatus: 'ambiguous' })
      await seedArtist({ canonicalName: 'khruangbin', matchStatus: 'matched' })

      const res = await app.request(
        '/v1/admin/artists?status=ambiguous&upcoming=false',
        {
          headers: ADMIN_HEADERS,
        },
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].canonicalName).toBe('nirvana')
    })

    it('treats an empty search as no filter', async () => {
      await seedArtist({ canonicalName: 'nirvana', matchStatus: 'ambiguous' })

      const res = await app.request(
        '/v1/admin/artists?search=&upcoming=false',
        {
          headers: ADMIN_HEADERS,
        },
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
    })

    it('filters to the not_an_artist tombstones', async () => {
      await seedArtist({
        canonicalName: 'bass bingo night',
        matchStatus: 'not_an_artist',
      })
      await seedArtist({ canonicalName: 'nirvana', matchStatus: 'ambiguous' })

      const res = await app.request(
        '/v1/admin/artists?status=not_an_artist&upcoming=false',
        { headers: ADMIN_HEADERS },
      )
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].canonicalName).toBe('bass bingo night')
    })

    // An admin who types a name wants that artist wherever it sits, not that
    // artist inside whichever chip happens to be selected.
    it('searches across every status, ignoring the status filter', async () => {
      await seedArtist({ canonicalName: 'nirvana', matchStatus: 'matched' })

      const res = await app.request(
        '/v1/admin/artists?status=ambiguous&search=nirv',
        { headers: ADMIN_HEADERS },
      )
      const body = await res.json()

      expect(body.data).toHaveLength(1)
      expect(body.data[0].canonicalName).toBe('nirvana')
    })

    it('pages with offset and reports the filtered total', async () => {
      await seedArtist({ canonicalName: 'aaa', matchStatus: 'ambiguous' })
      await seedArtist({ canonicalName: 'bbb', matchStatus: 'ambiguous' })
      await seedArtist({ canonicalName: 'ccc', matchStatus: 'matched' })

      const res = await app.request(
        '/v1/admin/artists?status=ambiguous&limit=1&offset=1&upcoming=false',
        { headers: ADMIN_HEADERS },
      )
      const body = await res.json()

      expect(body.data).toHaveLength(1)
      expect(body.data[0].canonicalName).toBe('bbb')
      // The total counts the filter, not the page.
      expect(body.total).toBe(2)
    })

    it('lists exhausted rows and drops them from their original queue', async () => {
      await seedArtist({
        canonicalName: 'nirvana',
        matchStatus: 'ambiguous',
        matchAttempts: MATCH_ATTEMPT_LIMIT,
      })
      await seedArtist({
        canonicalName: 'nobody at all',
        matchStatus: 'no_match',
        matchAttempts: MATCH_ATTEMPT_LIMIT,
      })
      await seedArtist({ canonicalName: 'aaa', matchStatus: 'ambiguous' })

      const exhausted = await app.request(
        '/v1/admin/artists?status=exhausted&upcoming=false',
        { headers: ADMIN_HEADERS },
      )
      const exhaustedBody = await exhausted.json()
      expect(exhausted.status).toBe(200)
      expect(
        exhaustedBody.data.map(
          (row: { canonicalName: string }) => row.canonicalName,
        ),
      ).toEqual(expect.arrayContaining(['nirvana', 'nobody at all']))
      expect(exhaustedBody.total).toBe(2)
      expect(
        exhaustedBody.data.every(
          (row: { isExhausted: boolean }) => row.isExhausted,
        ),
      ).toBe(true)

      const ambiguous = await app.request(
        '/v1/admin/artists?status=ambiguous&upcoming=false',
        { headers: ADMIN_HEADERS },
      )
      const ambiguousBody = await ambiguous.json()
      expect(ambiguousBody.data).toHaveLength(1)
      expect(ambiguousBody.data[0].canonicalName).toBe('aaa')
      expect(ambiguousBody.data[0].isExhausted).toBe(false)

      const noMatch = await app.request(
        '/v1/admin/artists?status=no_match&upcoming=false',
        { headers: ADMIN_HEADERS },
      )
      expect((await noMatch.json()).data).toHaveLength(0)
    })

    // A match resets the counter, so attempts left on a `matched` row are a
    // leftover from before it resolved — not something the job gave up on. The
    // row belongs to `matched` only, and must not be listed in both queues.
    it('ignores a spent counter on a status that cannot be exhausted', async () => {
      await seedArtist({
        canonicalName: 'khruangbin',
        matchStatus: 'matched',
        matchAttempts: MATCH_ATTEMPT_LIMIT,
      })

      const matched = await app.request(
        '/v1/admin/artists?status=matched&upcoming=false',
        { headers: ADMIN_HEADERS },
      )
      const matchedBody = await matched.json()
      expect(matchedBody.data).toHaveLength(1)
      expect(matchedBody.data[0].canonicalName).toBe('khruangbin')
      expect(matchedBody.data[0].isExhausted).toBe(false)

      const exhausted = await app.request(
        '/v1/admin/artists?status=exhausted&upcoming=false',
        { headers: ADMIN_HEADERS },
      )
      expect((await exhausted.json()).data).toHaveLength(0)

      const counts = await app.request(
        '/v1/admin/artists/counts?upcoming=false',
        {
          headers: ADMIN_HEADERS,
        },
      )
      const countsBody = await counts.json()
      expect(countsBody.data.matched).toBe(1)
      expect(countsBody.data.exhausted).toBe(0)
    })

    it('rejects an unknown status with a 400', async () => {
      const res = await app.request('/v1/admin/artists?status=bogus', {
        headers: ADMIN_HEADERS,
      })
      expect(res.status).toBe(400)
    })

    it('requires an admin role', async () => {
      authState.current = {
        userId: 'user_plain',
        sessionClaims: { metadata: { role: 'user' } },
      }
      const res = await app.request('/v1/admin/artists', {
        headers: ADMIN_HEADERS,
      })
      expect(res.status).toBe(403)
    })
  })

  describe('GET /v1/admin/artists/counts', () => {
    it('returns a count per match status', async () => {
      await seedArtist({ canonicalName: 'aaa', matchStatus: 'ambiguous' })
      await seedArtist({ canonicalName: 'bbb', matchStatus: 'ambiguous' })
      await seedArtist({ canonicalName: 'ccc', matchStatus: 'matched' })

      const res = await app.request('/v1/admin/artists/counts?upcoming=false', {
        headers: ADMIN_HEADERS,
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data).toEqual({
        unmatched: 0,
        matched: 1,
        ambiguous: 2,
        no_match: 0,
        not_an_artist: 0,
        exhausted: 0,
      })
    })

    it('counts a not_an_artist row', async () => {
      await seedArtist({
        canonicalName: 'bass bingo night',
        matchStatus: 'not_an_artist',
      })

      const res = await app.request('/v1/admin/artists/counts?upcoming=false', {
        headers: ADMIN_HEADERS,
      })
      const body = await res.json()

      expect(body.data.not_an_artist).toBe(1)
    })

    // Counted once, under `exhausted`. A row counted in both buckets never
    // lets the ambiguous number visibly drop, which is the entire point of
    // giving up on it.
    it('moves an exhausted row out of the bucket it came from', async () => {
      await seedArtist({
        canonicalName: 'nirvana',
        matchStatus: 'ambiguous',
        matchAttempts: MATCH_ATTEMPT_LIMIT,
      })
      await seedArtist({
        canonicalName: 'nobody at all',
        matchStatus: 'no_match',
        matchAttempts: MATCH_ATTEMPT_LIMIT,
      })
      await seedArtist({ canonicalName: 'aaa', matchStatus: 'ambiguous' })

      const res = await app.request('/v1/admin/artists/counts?upcoming=false', {
        headers: ADMIN_HEADERS,
      })
      const body = await res.json()

      expect(body.data).toEqual({
        unmatched: 0,
        matched: 0,
        ambiguous: 1,
        no_match: 0,
        not_an_artist: 0,
        exhausted: 2,
      })
    })
  })

  // The `upcoming` filter, which is ON by default. It must agree with the
  // public artist page's own upcoming query — a row the admin hides is a row
  // nobody will fix, so hiding one the site is still rendering is the failure
  // this block exists to catch.
  describe('the upcoming filter', () => {
    // Fixed rather than derived from the clock: the boundary these tests care
    // about is past-vs-future, and a date computed at run time makes a failure
    // depend on when it ran.
    const FUTURE = '2099-01-01'
    const PAST = '2000-01-01'

    const listNames = async (query: string): Promise<string[]> => {
      const res = await app.request(`/v1/admin/artists?${query}`, {
        headers: ADMIN_HEADERS,
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      return body.data.map(
        (row: { canonicalName: string }) => row.canonicalName,
      )
    }

    it('hides an artist whose only show has already happened', async () => {
      await seedArtist({ canonicalName: 'gone last year' })
      const venue = await seedVenue()
      await seedEvent(venue.id, {
        artist: 'gone last year',
        canonicalArtist: 'gone last year',
        date: PAST,
      })

      expect(await listNames('')).toEqual([])
      // Nothing was deleted — untick and the row is there.
      expect(await listNames('upcoming=false')).toEqual(['gone last year'])
    })

    it('lists an artist billed as the headliner of a future show', async () => {
      await seedArtist({ canonicalName: 'still playing' })
      const venue = await seedVenue()
      await seedEvent(venue.id, {
        artist: 'still playing',
        canonicalArtist: 'still playing',
        date: FUTURE,
      })

      expect(await listNames('')).toEqual(['still playing'])
    })

    // #1203 — the artist↔event join is a three-arm OR, and only the first arm
    // is the indexed `canonical_artist` column. An act that only ever appears
    // inside a co-headline or support billing has a public page, so filtering
    // on the fast path alone would hide exactly the rows the site renders.
    it('counts a co-headliner and a support billing, not just canonicalArtist', async () => {
      await seedArtist({ canonicalName: 'co headliner' })
      await seedArtist({ canonicalName: 'opener' })
      const venue = await seedVenue()
      await seedEvent(venue.id, {
        artist: 'top of the bill',
        canonicalArtist: 'top of the bill',
        canonicalHeadliners: ['co headliner', 'top of the bill'],
        canonicalSupporting: ['opener'],
        date: FUTURE,
      })

      expect((await listNames('')).sort()).toEqual(['co headliner', 'opener'])
    })

    // A cancelled or postponed night is still a page a visitor can land on,
    // and every other list surface keeps it.
    it('counts a cancelled future show', async () => {
      await seedArtist({ canonicalName: 'called off' })
      const venue = await seedVenue()
      await seedEvent(venue.id, {
        artist: 'called off',
        canonicalArtist: 'called off',
        date: FUTURE,
        status: 'cancelled',
      })

      expect(await listNames('')).toEqual(['called off'])
    })

    it.each([
      ['hidden from consumers', { hiddenFromConsumer: true }],
      ['gone from the venue site', { firstMissingAt: new Date() }],
    ])('does not count a future show %s', async (_label, overrides) => {
      await seedArtist({ canonicalName: 'invisible act' })
      const venue = await seedVenue()
      await seedEvent(venue.id, {
        artist: 'invisible act',
        canonicalArtist: 'invisible act',
        date: FUTURE,
        ...overrides,
      })

      expect(await listNames('')).toEqual([])
    })

    it('does not count a future show at a deactivated venue', async () => {
      await seedArtist({ canonicalName: 'shuttered room act' })
      const venue = await seedVenue({ active: false })
      await seedEvent(venue.id, {
        artist: 'shuttered room act',
        canonicalArtist: 'shuttered room act',
        date: FUTURE,
      })

      expect(await listNames('')).toEqual([])
    })

    // A row the admin has to untick a box to find is a row they will conclude
    // we do not have.
    it('is bypassed by a search', async () => {
      await seedArtist({ canonicalName: 'gone last year' })
      const venue = await seedVenue()
      await seedEvent(venue.id, {
        artist: 'gone last year',
        canonicalArtist: 'gone last year',
        date: PAST,
      })

      expect(await listNames('search=gone')).toEqual(['gone last year'])
    })

    // A chip promising a number its own table cannot produce is worse than no
    // number, so /counts takes the same param and must move with the list.
    it('counts agree with the list under both values', async () => {
      await seedArtist({
        canonicalName: 'playing soon',
        matchStatus: 'ambiguous',
      })
      await seedArtist({
        canonicalName: 'played already',
        matchStatus: 'ambiguous',
      })
      const venue = await seedVenue()
      await seedEvent(venue.id, {
        artist: 'playing soon',
        canonicalArtist: 'playing soon',
        date: FUTURE,
      })
      await seedEvent(venue.id, {
        artist: 'played already',
        canonicalArtist: 'played already',
        date: PAST,
      })

      const filtered = await app.request('/v1/admin/artists/counts', {
        headers: ADMIN_HEADERS,
      })
      expect((await filtered.json()).data.ambiguous).toBe(1)

      const everything = await app.request(
        '/v1/admin/artists/counts?upcoming=false',
        { headers: ADMIN_HEADERS },
      )
      expect((await everything.json()).data.ambiguous).toBe(2)
    })

    it('rejects a non-boolean upcoming value on both endpoints', async () => {
      const list = await app.request('/v1/admin/artists?upcoming=yes', {
        headers: ADMIN_HEADERS,
      })
      expect(list.status).toBe(400)

      const counts = await app.request(
        '/v1/admin/artists/counts?upcoming=yes',
        {
          headers: ADMIN_HEADERS,
        },
      )
      expect(counts.status).toBe(400)
    })
  })

  describe('PATCH /v1/admin/artists/:id', () => {
    it('promotes an ambiguous row to matched and writes an audit row', async () => {
      const id = await seedArtist({
        canonicalName: 'nirvana',
        matchStatus: 'ambiguous',
      })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: 'sp_nirvana' }),
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.matchStatus).toBe('matched')
      expect(body.data.spotifyArtistId).toBe('sp_nirvana')
      expect(body.data.matchConfidence).toBeNull()

      const audits = await testDb
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.actorId, 'admin_artist_test'),
            eq(auditLog.action, 'artist.match.update'),
          ),
        )
      expect(audits).toHaveLength(1)
      expect(audits[0]?.targetId).toBe(id)
    })

    it('demotes to no_match when the id is cleared', async () => {
      const id = await seedArtist({
        canonicalName: 'nirvana',
        matchStatus: 'matched',
        spotifyArtistId: 'sp_wrong',
      })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: null }),
      })
      const body = await res.json()

      expect(body.data.matchStatus).toBe('no_match')
      expect(body.data.spotifyArtistId).toBeNull()
    })

    // The ruling and the visibility switch record the same fact, but only
    // `hidden` is read by the public surfaces — so before this, a row ruled
    // not-an-artist kept its follow button, its slot on the bill and its page.
    it('hides a row ruled not-an-artist', async () => {
      const id = await seedArtist({
        canonicalName: 'son little: cityfolk tour 2026',
        matchStatus: 'ambiguous',
      })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          spotifyArtistId: null,
          matchStatus: 'not_an_artist',
        }),
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.matchStatus).toBe('not_an_artist')
      expect(body.data.hidden).toBe(true)
    })

    it('leaves visibility alone on any other ruling', async () => {
      const id = await seedArtist({
        canonicalName: 'nirvana',
        matchStatus: 'ambiguous',
      })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: 'sp_nirvana' }),
      })
      const body = await res.json()

      expect(body.data.hidden).toBe(false)
    })

    // Deriving the switch is one-directional: unhiding is its own admin action
    // on its own endpoint, so re-matching must not quietly restore a page an
    // admin took down.
    it('leaves a hidden row hidden when it is re-matched', async () => {
      const id = await seedArtist({
        canonicalName: 'son little: cityfolk tour 2026',
        matchStatus: 'not_an_artist',
        hidden: true,
      })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: 'sp_son_little' }),
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.matchStatus).toBe('matched')
      expect(body.data.hidden).toBe(true)
    })

    it('clears the photo when a matched row is demoted', async () => {
      const id = await seedArtist({
        canonicalName: 'nirvana',
        matchStatus: 'matched',
        spotifyArtistId: 'sp_wrong',
        photoUrl: 'https://i.scdn.co/image/wrong.jpg',
      })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: null }),
      })
      const body = await res.json()

      expect(body.data.photoUrl).toBeNull()
      expect(body.data.photoFetchedAt).toBeNull()
    })

    it('clears the photo when a matched row is repointed at a new identity', async () => {
      const id = await seedArtist({
        canonicalName: 'nirvana',
        matchStatus: 'matched',
        spotifyArtistId: 'sp_wrong',
        photoUrl: 'https://i.scdn.co/image/wrong.jpg',
      })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: 'sp_right' }),
      })
      const body = await res.json()

      expect(body.data.spotifyArtistId).toBe('sp_right')
      expect(body.data.photoUrl).toBeNull()
      expect(body.data.photoFetchedAt).toBeNull()
    })

    it('keeps the photo when the identity is unchanged', async () => {
      const id = await seedArtist({
        canonicalName: 'nirvana',
        matchStatus: 'ambiguous',
        spotifyArtistId: 'sp_same',
        photoUrl: 'https://i.scdn.co/image/keep.jpg',
      })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: 'sp_same' }),
      })
      const body = await res.json()

      expect(body.data.matchStatus).toBe('matched')
      expect(body.data.photoUrl).toBe('https://i.scdn.co/image/keep.jpg')
    })

    it('rejects a non-matched status carrying an id', async () => {
      const id = await seedArtist({ canonicalName: 'nirvana' })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          spotifyArtistId: 'sp_1',
          matchStatus: 'ambiguous',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('rejects a non-matched status carrying a photoUrl', async () => {
      const id = await seedArtist({ canonicalName: 'nirvana' })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          spotifyArtistId: null,
          photoUrl: 'https://i.scdn.co/image/x.jpg',
        }),
      })

      expect(res.status).toBe(400)
    })

    it('rejects matched without an id', async () => {
      const id = await seedArtist({ canonicalName: 'nirvana' })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: null, matchStatus: 'matched' }),
      })

      expect(res.status).toBe(400)
    })

    it('rejects an unknown field and a non-http photoUrl', async () => {
      const id = await seedArtist({ canonicalName: 'nirvana' })

      const unknownField = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: 'sp_x', nope: true }),
      })
      expect(unknownField.status).toBe(400)

      const badPhoto = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({
          spotifyArtistId: 'sp_x',
          photoUrl: 'javascript:alert(1)',
        }),
      })
      expect(badPhoto.status).toBe(400)
    })

    // A human has answered the question the job gave up on, so the row goes
    // back into the rotation with a full budget rather than carrying strikes
    // that describe a search nobody is running any more.
    it('returns an exhausted row to the rotation', async () => {
      const id = await seedArtist({
        canonicalName: 'nirvana',
        matchStatus: 'ambiguous',
        matchAttempts: MATCH_ATTEMPT_LIMIT,
      })

      const res = await app.request(`/v1/admin/artists/${id}`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ spotifyArtistId: 'sp_nirvana' }),
      })
      expect(res.status).toBe(200)

      const [row] = await testDb
        .select()
        .from(artists)
        .where(eq(artists.id, id))
      expect(row?.matchAttempts).toBe(0)
      expect(row?.matchCheckedAt).not.toBeNull()
    })

    it('404s an unknown artist', async () => {
      const res = await app.request(
        '/v1/admin/artists/11111111-1111-1111-1111-111111111111',
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ spotifyArtistId: 'sp_x' }),
        },
      )
      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /:id/visibility', () => {
    it('hides and restores a row without touching its match state', async () => {
      setAdminAuth()
      const id = await seedArtist({
        canonicalName: 'ghost canyon weekend passes',
        matchStatus: 'no_match',
      })

      const hide = await app.request(`/v1/admin/artists/${id}/visibility`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ hidden: true }),
      })
      expect(hide.status).toBe(200)
      const hidden = await testDb
        .select()
        .from(artists)
        .where(eq(artists.id, id))
      expect(hidden[0]?.hidden).toBe(true)
      // Visibility is orthogonal to identity — the match job must keep working
      // the row so an unhide needs no repair pass.
      expect(hidden[0]?.matchStatus).toBe('no_match')

      const restore = await app.request(`/v1/admin/artists/${id}/visibility`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ hidden: false }),
      })
      expect(restore.status).toBe(200)
      const restored = await testDb
        .select()
        .from(artists)
        .where(eq(artists.id, id))
      expect(restored[0]?.hidden).toBe(false)
    })

    it('writes an audit row', async () => {
      setAdminAuth()
      const id = await seedArtist({ canonicalName: 'audited package' })

      await app.request(`/v1/admin/artists/${id}/visibility`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ hidden: true }),
      })

      const rows = await testDb
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.actorId, 'admin_artist_test'),
            eq(auditLog.action, 'artist.visibility.update'),
          ),
        )
      expect(rows).toHaveLength(1)
    })

    it('rejects a non-boolean and 404s an unknown artist', async () => {
      setAdminAuth()
      const id = await seedArtist({ canonicalName: 'strict body' })

      const bad = await app.request(`/v1/admin/artists/${id}/visibility`, {
        method: 'PATCH',
        headers: ADMIN_HEADERS,
        body: JSON.stringify({ hidden: 'yes' }),
      })
      expect(bad.status).toBe(400)

      const missing = await app.request(
        '/v1/admin/artists/11111111-1111-1111-1111-111111111111/visibility',
        {
          method: 'PATCH',
          headers: ADMIN_HEADERS,
          body: JSON.stringify({ hidden: true }),
        },
      )
      expect(missing.status).toBe(404)
    })
  })
})
