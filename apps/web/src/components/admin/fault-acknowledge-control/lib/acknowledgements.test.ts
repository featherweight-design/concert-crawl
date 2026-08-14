import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

import {
  fetchVenueFault,
  acknowledgeFault,
  unacknowledgeFault,
} from './acknowledgements'

const VENUE_ID = '11111111-1111-1111-1111-111111111111'
const OTHER_ID = '22222222-2222-2222-2222-222222222222'

const fault = (venueId: string, id: string) => ({
  id,
  venueId,
  venue: 'Summit',
  band: 'suspect',
  persistedSince: '2026-08-08T09:00:00.000Z',
  days: 6,
  dur: '6d',
  crawlRunId: null,
  condition: 'blocked',
  evidence: { status: 403, refusals: 4, lastSuccess: null },
})

const sweep = {
  venues: 30,
  at: '3:04 AM',
  atIso: '2026-08-14T09:04:00.000Z',
  events: 812,
  next: 'tomorrow 3:00 AM',
}

describe('fetchVenueFault', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it('picks out only this venue’s fault', async () => {
    mockGet.mockResolvedValue({
      faults: [fault(OTHER_ID, 'f-other'), fault(VENUE_ID, 'f-mine')],
      queues: [],
      sweep,
    })
    const result = await fetchVenueFault(VENUE_ID, 'tok')
    expect(result.fault?.id).toBe('f-mine')
    expect(result.acknowledged).toBeNull()
  })

  it('finds the venue in the acknowledged list too', async () => {
    mockGet.mockResolvedValue({
      faults: [],
      acknowledged: [
        {
          ...fault(VENUE_ID, 'f-mine'),
          acknowledgement: {
            evidenceKind: null,
            evidenceValue: '403',
            reason: 'Expected.',
            acknowledgedBy: 'user_admin_1',
            acknowledgedAt: '2026-08-14T03:00:00.000Z',
          },
        },
      ],
      queues: [],
      sweep,
    })
    const result = await fetchVenueFault(VENUE_ID, 'tok')
    expect(result.acknowledged?.acknowledgement.reason).toBe('Expected.')
    expect(result.fault).toBeNull()
  })

  // A payload the guard rejects must read as "nothing to show" rather than
  // throwing into an inspector tab that has nothing to do with triage.
  it('reads an unusable payload as no fault', async () => {
    mockGet.mockResolvedValue({ nope: true })
    expect(await fetchVenueFault(VENUE_ID, 'tok')).toEqual({
      fault: null,
      acknowledged: null,
    })
  })
})

describe('acknowledgeFault', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockDelete.mockReset()
  })

  it('posts the acknowledgement to the venue', async () => {
    mockPost.mockResolvedValue({})
    const body = {
      condition: 'ceiling' as const,
      evidenceKind: 'pinned_count' as const,
      evidenceValue: '36',
      reason: 'Expected.',
    }
    await acknowledgeFault(VENUE_ID, body, 'tok')
    expect(mockPost).toHaveBeenCalledWith(
      `/v1/admin/venues/${VENUE_ID}/fault-acknowledgements`,
      'tok',
      body,
    )
  })

  it('deletes by condition', async () => {
    mockDelete.mockResolvedValue({})
    await unacknowledgeFault(VENUE_ID, 'ceiling', 'tok')
    expect(mockDelete).toHaveBeenCalledWith(
      `/v1/admin/venues/${VENUE_ID}/fault-acknowledgements/ceiling`,
      'tok',
    )
  })
})
