import { describe, it, expect, beforeEach, vi } from 'vitest'

interface TestAuth {
  userId: string
  sessionClaims: { metadata?: { role?: string } }
}

const { authState } = vi.hoisted(() => {
  const state: { current: TestAuth | null } = { current: null }
  return { authState: state }
})

vi.mock('@hono/clerk-auth', () => ({
  clerkMiddleware: () => async (_c: unknown, next: () => Promise<void>) =>
    next(),
  getAuth: () => authState.current,
}))

import { createApp } from '../../app.js'
import { clearTables, seedVenue } from '../../test/helpers/seed.js'
import { testDb } from '../../test/helpers/db.js'
import {
  auditLog,
  crawlRuns,
  venueFaultAcknowledgements,
} from '@concert-crawl/db'
import { desc } from 'drizzle-orm'

const app = createApp()

const DAY_MS = 24 * 60 * 60 * 1000

function setAuth(role: 'admin' | 'user', userId = 'test-admin-1'): void {
  authState.current = { userId, sessionClaims: { metadata: { role } } }
}

async function latestAuditRow(): Promise<
  typeof auditLog.$inferSelect | undefined
> {
  const [row] = await testDb
    .select()
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(1)
  return row
}

/** A venue whose last run collapsed against a flat baseline — a wentDark fault. */
async function seedDarkVenue(): Promise<
  typeof import('@concert-crawl/db').venues.$inferSelect
> {
  const venue = await seedVenue({ name: 'Bluebird Theater', slug: 'bluebird' })
  const rows = [
    ...Array.from({ length: 7 }, (_, index) => ({
      status: 'success' as const,
      eventsFound: 12 + (index % 3),
      eventsUsable: 12,
    })),
    { status: 'success' as const, eventsFound: 2, eventsUsable: 2 },
  ]
  for (let index = 0; index < rows.length; index += 1) {
    await testDb.insert(crawlRuns).values({
      venueId: venue.id,
      createdAt: new Date(Date.now() - (rows.length - index) * DAY_MS),
      ...rows[index]!,
    })
  }
  return venue
}

interface AckBody {
  success: boolean
  data: {
    venueId: string
    condition: string
    evidenceKind: string | null
    evidenceValue: string | null
    reason: string
    acknowledgedBy: string
  }
}

interface TriageBody {
  success: boolean
  data: {
    faults: { condition: string; venueId: string }[]
    acknowledged: {
      condition: string
      venueId: string
      acknowledgement: {
        reason: string
        acknowledgedBy: string
        acknowledgedAt: string
      }
    }[]
    queues: unknown[]
    sweep: Record<string, unknown>
  }
}

async function acknowledge(
  venueId: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return app.request(`/v1/admin/venues/${venueId}/fault-acknowledgements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const wentDarkAck = {
  condition: 'wentDark',
  evidenceKind: null,
  evidenceValue: '2',
  reason: 'Venue only books weekends in the off-season.',
}

describe('POST /v1/admin/venues/:id/fault-acknowledgements', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('requires an admin role', async () => {
    setAuth('user')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })
    const res = await acknowledge(venue.id, wentDarkAck)
    expect(res.status).toBe(403)
  })

  it('creates an acknowledgement and audits it', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      condition: 'ceiling',
      evidenceKind: 'pinned_count',
      evidenceValue: '36',
      reason: 'Permanent Live Nation listing cap.',
    })
    expect(res.status).toBe(200)

    const body: AckBody = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.venueId).toBe(venue.id)
    expect(body.data.condition).toBe('ceiling')
    expect(body.data.evidenceKind).toBe('pinned_count')
    expect(body.data.evidenceValue).toBe('36')
    expect(body.data.acknowledgedBy).toBe('test-admin-1')

    const audit = await latestAuditRow()
    expect(audit?.action).toBe('venue.fault.acknowledge')
    expect(audit?.targetId).toBe(venue.id)
    expect(audit?.actorId).toBe('test-admin-1')
    expect(audit?.metadata).toMatchObject({
      condition: 'ceiling',
      evidenceValue: '36',
    })
  })

  it('replaces the existing acknowledgement when the figure moves', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    await acknowledge(venue.id, {
      condition: 'ceiling',
      evidenceKind: 'pinned_count',
      evidenceValue: '36',
      reason: 'Live Nation cap at 36.',
    })
    const res = await acknowledge(venue.id, {
      condition: 'ceiling',
      evidenceKind: 'pinned_count',
      evidenceValue: '41',
      reason: 'Cap moved to 41, still expected.',
    })
    expect(res.status).toBe(200)

    const rows = await testDb.select().from(venueFaultAcknowledgements)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.evidenceValue).toBe('41')
    expect(rows[0]?.reason).toBe('Cap moved to 41, still expected.')
  })

  it('rejects a blank reason', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, { ...wentDarkAck, reason: '   ' })
    expect(res.status).toBe(400)
    expect(await testDb.select().from(venueFaultAcknowledgements)).toEqual([])
  })

  it('rejects an unknown condition', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      ...wentDarkAck,
      condition: 'notACondition',
    })
    expect(res.status).toBe(400)
  })

  it('rejects an evidence kind on a condition that has only one shape', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      ...wentDarkAck,
      evidenceKind: 'pinned_count',
    })
    expect(res.status).toBe(400)
    expect(await testDb.select().from(venueFaultAcknowledgements)).toEqual([])
  })

  it('rejects a ceiling acknowledgement with no evidence kind', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      condition: 'ceiling',
      evidenceKind: null,
      evidenceValue: '36',
      reason: 'Live Nation cap.',
    })
    expect(res.status).toBe(400)
  })

  it('rejects a null evidence value on a condition that always has a figure', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      ...wentDarkAck,
      evidenceValue: null,
    })
    expect(res.status).toBe(400)
  })

  it('accepts a null evidence value when the venue was blocked with no status', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      condition: 'blocked',
      evidenceKind: null,
      evidenceValue: null,
      reason: 'Cloudflare challenge, no status returned.',
    })
    expect(res.status).toBe(200)
  })

  it('trims the evidence value so stray whitespace cannot break matching', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      ...wentDarkAck,
      evidenceValue: ' 2 ',
    })
    expect(res.status).toBe(200)

    const rows = await testDb.select().from(venueFaultAcknowledgements)
    expect(rows[0]?.evidenceValue).toBe('2')
  })

  it('rejects an evidence value that is not a count', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      ...wentDarkAck,
      evidenceValue: 'a few',
    })
    expect(res.status).toBe(400)
  })

  it('rejects a shrinking-horizon evidence value that is not a date', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      condition: 'ceiling',
      evidenceKind: 'horizon_shrank',
      evidenceValue: 'November',
      reason: 'Outdoor season ends in the autumn.',
    })
    expect(res.status).toBe(400)
  })

  it('accepts a shrinking-horizon acknowledgement pinned to a date', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      condition: 'ceiling',
      evidenceKind: 'horizon_shrank',
      evidenceValue: '2026-11-08',
      reason: 'Outdoor season ends in the autumn.',
    })
    expect(res.status).toBe(200)
  })

  it('rejects a horizon date that is not a real day', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      condition: 'ceiling',
      evidenceKind: 'horizon_shrank',
      evidenceValue: '2026-13-40',
      reason: 'Outdoor season ends in the autumn.',
    })
    expect(res.status).toBe(400)
  })

  it('rejects an http status outside the real range', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      condition: 'blocked',
      evidenceKind: null,
      evidenceValue: '999',
      reason: 'Cloudflare sits in front of this venue.',
    })
    expect(res.status).toBe(400)
  })

  it('rejects a blocked evidence value that is not an http status', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await acknowledge(venue.id, {
      condition: 'blocked',
      evidenceKind: null,
      evidenceValue: 'forbidden',
      reason: 'Cloudflare sits in front of this venue.',
    })
    expect(res.status).toBe(400)
  })

  it('rejects a venue id that is not a uuid', async () => {
    setAuth('admin')
    const res = await acknowledge('not-a-uuid', wentDarkAck)
    expect(res.status).toBe(400)
  })

  it('404s for a venue that does not exist', async () => {
    setAuth('admin')
    const res = await acknowledge(
      '00000000-0000-0000-0000-000000000000',
      wentDarkAck,
    )
    expect(res.status).toBe(404)
  })
})

describe('DELETE /v1/admin/venues/:id/fault-acknowledgements/:condition', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  it('removes the acknowledgement and audits it', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })
    await acknowledge(venue.id, wentDarkAck)

    const res = await app.request(
      `/v1/admin/venues/${venue.id}/fault-acknowledgements/wentDark`,
      { method: 'DELETE' },
    )
    expect(res.status).toBe(200)
    expect(await testDb.select().from(venueFaultAcknowledgements)).toEqual([])

    const audit = await latestAuditRow()
    expect(audit?.action).toBe('venue.fault.unacknowledge')
    expect(audit?.targetId).toBe(venue.id)
    expect(audit?.metadata).toMatchObject({ condition: 'wentDark' })
  })

  it('rejects an unknown condition in the path', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await app.request(
      `/v1/admin/venues/${venue.id}/fault-acknowledgements/notACondition`,
      { method: 'DELETE' },
    )
    expect(res.status).toBe(400)
  })

  it('404s when there is nothing to remove', async () => {
    setAuth('admin')
    const venue = await seedVenue({ name: 'Summit', slug: 'summit' })

    const res = await app.request(
      `/v1/admin/venues/${venue.id}/fault-acknowledgements/wentDark`,
      { method: 'DELETE' },
    )
    expect(res.status).toBe(404)
  })
})

describe('GET /v1/admin/triage — acknowledgement partition', () => {
  beforeEach(async () => {
    authState.current = null
    await clearTables()
  })

  async function fetchTriage(): Promise<TriageBody['data']> {
    const res = await app.request('/v1/admin/triage')
    expect(res.status).toBe(200)
    const body: TriageBody = await res.json()
    expect(body.success).toBe(true)
    return body.data
  }

  it('leaves faults untouched and acknowledged empty when no rows exist', async () => {
    setAuth('admin')
    await seedDarkVenue()

    const data = await fetchTriage()
    expect(data.faults.map((row) => row.condition)).toEqual(['wentDark'])
    expect(data.acknowledged).toEqual([])
  })

  it('moves a matching fault into acknowledged with its provenance', async () => {
    setAuth('admin')
    const venue = await seedDarkVenue()
    await acknowledge(venue.id, wentDarkAck)

    const data = await fetchTriage()
    expect(data.faults).toEqual([])
    expect(data.acknowledged).toHaveLength(1)
    expect(data.acknowledged[0]?.condition).toBe('wentDark')
    expect(data.acknowledged[0]?.venueId).toBe(venue.id)
    expect(data.acknowledged[0]?.acknowledgement.reason).toBe(
      wentDarkAck.reason,
    )
    expect(data.acknowledged[0]?.acknowledgement.acknowledgedBy).toBe(
      'test-admin-1',
    )
    expect(data.acknowledged[0]?.acknowledgement.acknowledgedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T/,
    )
  })

  it('re-fires the fault once the acknowledged figure moves', async () => {
    setAuth('admin')
    const venue = await seedDarkVenue()
    // Acknowledged at 2 events; the next run returns 1, which is a different
    // figure and therefore a change the operator has not seen.
    await acknowledge(venue.id, wentDarkAck)
    expect((await fetchTriage()).faults).toEqual([])

    await testDb.insert(crawlRuns).values({
      venueId: venue.id,
      status: 'success',
      eventsFound: 1,
      eventsUsable: 1,
    })

    const data = await fetchTriage()
    expect(data.faults.map((row) => row.condition)).toEqual(['wentDark'])
    expect(data.acknowledged).toEqual([])
  })

  it('does not suppress a fault acknowledged on a different venue', async () => {
    setAuth('admin')
    const dark = await seedDarkVenue()
    const other = await seedVenue({ name: 'Other Hall', slug: 'other' })
    await acknowledge(other.id, wentDarkAck)

    const data = await fetchTriage()
    expect(data.faults.map((row) => row.venueId)).toEqual([dark.id])
    expect(data.acknowledged).toEqual([])
  })
})
