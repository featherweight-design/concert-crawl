import { describe, it, expect, beforeEach, vi } from 'vitest'

const { authState } = vi.hoisted(() => ({
  authState: {
    current: null as {
      userId: string
      sessionClaims: { metadata?: { role?: string } }
    } | null,
  },
}))

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../../app.js'
import { clearTables, seedVenue } from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'
import { auditLog, venueGuideChips, venues } from '@concert-crawl/db'
import { and, desc, eq } from 'drizzle-orm'

const app = createApp()

function setAuth(role: 'admin' | 'sub_admin' | 'user'): void {
  authState.current = {
    userId: 'test-admin-1',
    sessionClaims: { metadata: { role } },
  }
}

function clearAuth(): void {
  authState.current = null
}

async function auditRowsFor(
  action: string,
): Promise<(typeof auditLog.$inferSelect)[]> {
  return testDb
    .select()
    .from(auditLog)
    .where(eq(auditLog.action, action))
    .orderBy(desc(auditLog.createdAt))
}

async function chipRows(
  venueId: string,
): Promise<(typeof venueGuideChips.$inferSelect)[]> {
  return testDb
    .select()
    .from(venueGuideChips)
    .where(eq(venueGuideChips.venueId, venueId))
}

async function publishedAt(venueId: string): Promise<Date | null> {
  const [row] = await testDb
    .select({ guidePublishedAt: venues.guidePublishedAt })
    .from(venues)
    .where(eq(venues.id, venueId))
  return row?.guidePublishedAt ?? null
}

function putGuide(venueId: string, payload: unknown): Promise<Response> {
  return app.request(`/v1/admin/venues/${venueId}/guide`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

describe('/v1/admin/venues/:id/guide (#764)', () => {
  beforeEach(async () => {
    clearAuth()
    await clearTables()
  })

  describe('PUT — save draft', () => {
    it('persists accessibility + 2 chips and returns them in GUIDE_CHIP_ORDER', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-put-1' })

      const res = await putGuide(venue.id, {
        insiderTip: '  Runs loud — earplugs at the bar.  ',
        chips: [
          { chipType: 'transit', body: 'A-line to 38th & Blake.' },
          { chipType: 'accessibility', body: 'Step-free entry on the north.' },
          { chipType: 'parking', body: '$15 cash lot on Blake.' },
        ],
      })
      expect(res.status).toBe(200)

      const body = (await res.json()) as {
        success: boolean
        data: {
          chips: { chipType: string; body: string; isPlaceholder: boolean }[]
          insiderTip: string | null
          publishedAt: string | null
        }
      }
      expect(body.success).toBe(true)
      expect(body.data.chips.map((chip) => chip.chipType)).toEqual([
        'accessibility',
        'parking',
        'transit',
      ])
      expect(body.data.insiderTip).toBe('Runs loud — earplugs at the bar.')
      expect(body.data.publishedAt).toBeNull()

      expect(await chipRows(venue.id)).toHaveLength(3)

      const getRes = await app.request(`/v1/admin/venues/${venue.id}/guide`)
      expect(getRes.status).toBe(200)
      const getBody = (await getRes.json()) as {
        data: { chips: { chipType: string }[] }
      }
      expect(getBody.data.chips.map((chip) => chip.chipType)).toEqual([
        'accessibility',
        'parking',
        'transit',
      ])
    })

    it('drops a chip whose body is whitespace-only', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-put-blank' })

      const res = await putGuide(venue.id, {
        chips: [
          { chipType: 'accessibility', body: 'Step-free entry.' },
          { chipType: 'parking', body: '   ' },
        ],
      })
      expect(res.status).toBe(200)

      const rows = await chipRows(venue.id)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.chipType).toBe('accessibility')
    })

    it('rejects isPlaceholder on a non-accessibility chip', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-put-badplaceholder' })

      const res = await putGuide(venue.id, {
        chips: [{ chipType: 'parking', body: '', isPlaceholder: true }],
      })
      expect(res.status).toBe(400)
      expect(await chipRows(venue.id)).toHaveLength(0)
    })

    it('rejects duplicate chipType', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-put-dupe' })

      const res = await putGuide(venue.id, {
        chips: [
          { chipType: 'parking', body: 'Lot A' },
          { chipType: 'parking', body: 'Lot B' },
        ],
      })
      expect(res.status).toBe(400)
      expect(await chipRows(venue.id)).toHaveLength(0)
    })

    it('replaces the chip set rather than accumulating', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-put-replace' })

      await putGuide(venue.id, {
        chips: [
          { chipType: 'accessibility', body: 'Step-free entry.' },
          { chipType: 'parking', body: '$15 cash.' },
        ],
      })
      expect(await chipRows(venue.id)).toHaveLength(2)

      await putGuide(venue.id, {
        chips: [{ chipType: 'parking', body: '$20 cash now.' }],
      })
      const rows = await chipRows(venue.id)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.chipType).toBe('parking')
      expect(rows[0]?.body).toBe('$20 cash now.')
    })

    it("rejects the design prototype's short key 'age'", async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-put-shortkey' })

      const res = await putGuide(venue.id, {
        chips: [{ chipType: 'age', body: '18+ in, 21+ to drink.' }],
      })
      expect(res.status).toBe(400)
    })

    it('stores a placeholder accessibility chip with an empty body', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-put-placeholder' })

      const res = await putGuide(venue.id, {
        chips: [
          {
            chipType: 'accessibility',
            body: 'leftover draft',
            isPlaceholder: true,
          },
        ],
      })
      expect(res.status).toBe(200)

      const rows = await chipRows(venue.id)
      expect(rows).toHaveLength(1)
      expect(rows[0]?.isPlaceholder).toBe(true)
      expect(rows[0]?.body).toBe('')
    })

    it('writes a venue.guide.save audit row', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-put-audit' })

      await putGuide(venue.id, {
        insiderTip: 'Come early.',
        chips: [{ chipType: 'accessibility', body: 'Step-free entry.' }],
      })

      const rows = await auditRowsFor('venue.guide.save')
      expect(rows).toHaveLength(1)
      expect(rows[0]?.targetId).toBe(venue.id)
      expect(rows[0]?.actorId).toBe('test-admin-1')
      expect(rows[0]?.metadata).toMatchObject({
        chipCount: 1,
        hasInsiderTip: true,
        accessibilityState: 'authored',
      })
    })

    it('404s for an unknown venue', async () => {
      setAuth('admin')
      const res = await putGuide('00000000-0000-0000-0000-000000000000', {
        chips: [],
      })
      expect(res.status).toBe(404)
    })

    // A save replaces the authored set, but `chip_type` is plain text and the
    // read path skips keys outside the current pool. A venue-wide delete would
    // therefore destroy rows this admin never saw — and so could not re-send.
    it('leaves chip rows outside GUIDE_CHIP_ORDER untouched', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-put-preserves-unknown' })
      await testDb
        .insert(venueGuideChips)
        .values([{ venueId: venue.id, chipType: 'weather', body: 'Cold.' }])

      const res = await putGuide(venue.id, {
        chips: [{ chipType: 'accessibility', body: 'Step-free entry.' }],
      })
      expect(res.status).toBe(200)

      const rows = await testDb
        .select()
        .from(venueGuideChips)
        .where(
          and(
            eq(venueGuideChips.venueId, venue.id),
            eq(venueGuideChips.chipType, 'weather'),
          ),
        )
      expect(rows).toHaveLength(1)
    })

    it('404s for a malformed venue id on every guide endpoint', async () => {
      setAuth('admin')
      expect((await putGuide('not-a-uuid', { chips: [] })).status).toBe(404)
      expect(
        (await app.request('/v1/admin/venues/not-a-uuid/guide')).status,
      ).toBe(404)
      for (const action of ['publish', 'unpublish']) {
        const res = await app.request(
          `/v1/admin/venues/not-a-uuid/guide/${action}`,
          { method: 'POST' },
        )
        expect(res.status).toBe(404)
      }
    })

    it('403s for a non-admin caller', async () => {
      setAuth('user')
      const venue = await seedVenue({ slug: 'guide-put-403' })
      const res = await putGuide(venue.id, { chips: [] })
      expect(res.status).toBe(403)
    })
  })

  describe('POST /publish', () => {
    it('400s with blank accessibility and leaves guide_published_at NULL', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-publish-blocked' })
      await putGuide(venue.id, {
        chips: [{ chipType: 'parking', body: '$15 cash.' }],
      })

      const res = await app.request(
        `/v1/admin/venues/${venue.id}/guide/publish`,
        { method: 'POST' },
      )
      expect(res.status).toBe(400)
      const body = (await res.json()) as {
        success: boolean
        field?: string
      }
      expect(body.success).toBe(false)
      expect(body.field).toBe('accessibility')
      expect(await publishedAt(venue.id)).toBeNull()
    })

    it('publishes with a placeholder accessibility chip', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-publish-placeholder' })
      await putGuide(venue.id, {
        chips: [{ chipType: 'accessibility', body: '', isPlaceholder: true }],
      })

      const res = await app.request(
        `/v1/admin/venues/${venue.id}/guide/publish`,
        { method: 'POST' },
      )
      expect(res.status).toBe(200)
      expect(await publishedAt(venue.id)).not.toBeNull()

      const rows = await auditRowsFor('venue.guide.publish')
      expect(rows).toHaveLength(1)
      expect(rows[0]?.targetId).toBe(venue.id)
      expect(rows[0]?.metadata).toMatchObject({
        publishState: 'ready_with_placeholder',
      })
    })

    it('publishes with authored accessibility', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-publish-ready' })
      await putGuide(venue.id, {
        chips: [{ chipType: 'accessibility', body: 'Step-free entry.' }],
      })

      const res = await app.request(
        `/v1/admin/venues/${venue.id}/guide/publish`,
        { method: 'POST' },
      )
      expect(res.status).toBe(200)
      expect(await publishedAt(venue.id)).not.toBeNull()
    })

    it('403s for a non-admin caller', async () => {
      setAuth('user')
      const venue = await seedVenue({ slug: 'guide-publish-403' })
      const res = await app.request(
        `/v1/admin/venues/${venue.id}/guide/publish`,
        { method: 'POST' },
      )
      expect(res.status).toBe(403)
    })
  })

  describe('POST /unpublish', () => {
    async function publishFixture(slug: string): Promise<string> {
      const venue = await seedVenue({ slug })
      await putGuide(venue.id, {
        chips: [{ chipType: 'accessibility', body: 'Step-free entry.' }],
      })
      await app.request(`/v1/admin/venues/${venue.id}/guide/publish`, {
        method: 'POST',
      })
      return venue.id
    }

    it('sets guide_published_at back to NULL', async () => {
      setAuth('admin')
      const venueId = await publishFixture('guide-unpublish-1')
      expect(await publishedAt(venueId)).not.toBeNull()

      const res = await app.request(
        `/v1/admin/venues/${venueId}/guide/unpublish`,
        { method: 'POST' },
      )
      expect(res.status).toBe(200)
      expect(await publishedAt(venueId)).toBeNull()
    })

    it('is a no-op 200 on an already-unpublished guide', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-unpublish-noop' })

      const res = await app.request(
        `/v1/admin/venues/${venue.id}/guide/unpublish`,
        { method: 'POST' },
      )
      expect(res.status).toBe(200)
      expect(await publishedAt(venue.id)).toBeNull()
    })

    it('writes a venue.guide.unpublish audit row', async () => {
      setAuth('admin')
      const venueId = await publishFixture('guide-unpublish-audit')

      await app.request(`/v1/admin/venues/${venueId}/guide/unpublish`, {
        method: 'POST',
      })

      const rows = await auditRowsFor('venue.guide.unpublish')
      expect(rows).toHaveLength(1)
      expect(rows[0]?.targetId).toBe(venueId)
      expect(rows[0]?.actorId).toBe('test-admin-1')
      expect(rows[0]?.metadata).toMatchObject({ wasPublished: true })
    })

    it('403s for a non-admin caller', async () => {
      setAuth('user')
      const venue = await seedVenue({ slug: 'guide-unpublish-403' })
      const res = await app.request(
        `/v1/admin/venues/${venue.id}/guide/unpublish`,
        { method: 'POST' },
      )
      expect(res.status).toBe(403)
    })
  })

  describe('GET', () => {
    it('returns an empty guide for a venue with no chips', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-get-empty' })

      const res = await app.request(`/v1/admin/venues/${venue.id}/guide`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as {
        data: {
          chips: unknown[]
          insiderTip: string | null
          publishedAt: string | null
        }
      }
      expect(body.data.chips).toEqual([])
      expect(body.data.insiderTip).toBeNull()
      expect(body.data.publishedAt).toBeNull()
    })

    it('404s for an unknown venue', async () => {
      setAuth('admin')
      const res = await app.request(
        '/v1/admin/venues/00000000-0000-0000-0000-000000000000/guide',
      )
      expect(res.status).toBe(404)
    })

    it('skips unknown chip_type rows written outside the API', async () => {
      setAuth('admin')
      const venue = await seedVenue({ slug: 'guide-get-unknownchip' })
      await testDb.insert(venueGuideChips).values([
        { venueId: venue.id, chipType: 'accessibility', body: 'Step-free.' },
        { venueId: venue.id, chipType: 'weather', body: 'Cold.' },
      ])

      const res = await app.request(`/v1/admin/venues/${venue.id}/guide`)
      const body = (await res.json()) as {
        data: { chips: { chipType: string }[] }
      }
      expect(body.data.chips.map((chip) => chip.chipType)).toEqual([
        'accessibility',
      ])

      // The unknown row is untouched by a read.
      const rows = await testDb
        .select()
        .from(venueGuideChips)
        .where(
          and(
            eq(venueGuideChips.venueId, venue.id),
            eq(venueGuideChips.chipType, 'weather'),
          ),
        )
      expect(rows).toHaveLength(1)
    })
  })
})
