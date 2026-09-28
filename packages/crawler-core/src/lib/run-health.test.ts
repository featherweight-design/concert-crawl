import { beforeEach, describe, it, expect, vi } from 'vitest'
import {
  describeDegradation,
  evaluateRunHealth,
  reportRunHealth,
  runHealthFingerprint,
  type RunDegradation,
  type VenueRunOutcome,
} from './run-health.js'

const { mockSendRunDegradedEmail, mockReportFailure } = vi.hoisted(() => ({
  mockSendRunDegradedEmail: vi.fn(),
  mockReportFailure: vi.fn(),
}))
vi.mock('./email.js', () => ({
  sendRunDegradedEmail: mockSendRunDegradedEmail,
}))
vi.mock('@concert-crawl/logger', () => ({ reportFailure: mockReportFailure }))

beforeEach(() => {
  vi.clearAllMocks()
  mockSendRunDegradedEmail.mockResolvedValue(undefined)
})

const QUOTA =
  'Error: 400 {"error":{"message":"You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC."}}'

const ok = (name: string): VenueRunOutcome => ({
  venueId: name,
  venueName: name,
  errorMessage: null,
})
const failed = (name: string, message: string): VenueRunOutcome => ({
  venueId: name,
  venueName: name,
  errorMessage: message,
})
const healthy = (count: number) =>
  Array.from({ length: count }, (_, i) => ok(`ok-${i}`))

describe('evaluateRunHealth', () => {
  it('reports nothing for a clean run', () => {
    expect(evaluateRunHealth(healthy(20))).toEqual([])
  })

  it('reports the 2026-09-28 run as both a failure rate and a shared cause', () => {
    const names = [
      'Red Rocks',
      'Cervantes',
      'Hi-Dive',
      'Larimer',
      'Globe Hall',
      'Lost Lake',
      'Ball Arena',
      'Meow Wolf',
    ]
    const result = evaluateRunHealth([
      ...names.map((name) => failed(name, QUOTA)),
      ...healthy(12),
    ])
    expect(result).toContainEqual({
      kind: 'failure_rate',
      failed: 8,
      total: 20,
    })
    expect(result).toContainEqual({
      kind: 'shared_cause',
      errorKey: 'llm_quota',
      errorKind: 'llm_quota',
      venueNames: [...names].sort(),
    })
  })

  it('stays quiet for one venue failing, which is ordinary (3 such days in 91)', () => {
    expect(
      evaluateRunHealth([
        failed('Larimer', 'TypeError: fetch failed'),
        ...healthy(19),
      ]),
    ).toEqual([])
  })

  it('counts distinct venues, not outcomes: one venue twice is not a shared cause', () => {
    // Defensive: the daily loop crawls each venue once, but a caller that merged
    // triggered and daily outcomes would not. Prod's only repeated-error day
    // (2026-07-18, Levitt Pavilion) was exactly that shape across two runs.
    const robots = 'VenuePilotFetchError: robots.txt disallows ConcertCrawl/1.0'
    const shared = evaluateRunHealth([
      failed('Levitt', robots),
      failed('Levitt', robots),
      ...healthy(18),
    ]).filter((degradation) => degradation.kind === 'shared_cause')
    expect(shared).toEqual([])
  })

  it('flags two different venues failing on the same normalized error', () => {
    const shared = evaluateRunHealth([
      failed(
        'A',
        'TimeoutError: Timeout 30000ms exceeded navigating to https://a.example.com',
      ),
      failed(
        'B',
        'TimeoutError: Timeout 30000ms exceeded navigating to https://b.example.com',
      ),
      ...healthy(18),
    ]).filter((degradation) => degradation.kind === 'shared_cause')
    expect(shared).toHaveLength(1)
  })

  it('needs 3 failures before the rate alone fires, so a tiny run cannot trip it', () => {
    const rate = evaluateRunHealth([
      failed('A', 'x'),
      failed('B', 'y'),
      ok('C'),
    ]).filter((degradation) => degradation.kind === 'failure_rate')
    expect(rate).toEqual([])
  })
})

const QUOTA_CAUSE: RunDegradation = {
  kind: 'shared_cause',
  errorKey: 'llm_quota',
  errorKind: 'llm_quota',
  venueNames: ['Hi-Dive', 'Red Rocks'],
}
const RATE: RunDegradation = { kind: 'failure_rate', failed: 8, total: 20 }

describe('describeDegradation', () => {
  it('says an llm_quota cause is account-wide, not a venue problem', () => {
    const line = describeDegradation(QUOTA_CAUSE)
    expect(line).toContain('account-wide')
    expect(line).toContain('Hi-Dive, Red Rocks')
  })
})

describe('runHealthFingerprint', () => {
  it('groups by the shared causes, sorted, so each cause is its own Sentry issue', () => {
    const other: RunDegradation = {
      ...QUOTA_CAUSE,
      errorKey: 'TypeError: fetch failed',
      errorKind: 'other',
    }
    expect(runHealthFingerprint([RATE, other, QUOTA_CAUSE])).toEqual([
      'crawl.run_degraded',
      'TypeError: fetch failed',
      'llm_quota',
    ])
  })

  it('falls back to failure_rate when no cause is shared', () => {
    expect(runHealthFingerprint([RATE])).toEqual([
      'crawl.run_degraded',
      'failure_rate',
    ])
  })
})

describe('reportRunHealth', () => {
  it('does nothing for a healthy run', async () => {
    await reportRunHealth([], { failed: 0, total: 20 })
    expect(mockReportFailure).not.toHaveBeenCalled()
    expect(mockSendRunDegradedEmail).not.toHaveBeenCalled()
  })

  it('reports to Sentry with the cause fingerprint and emails the admin', async () => {
    await reportRunHealth([RATE, QUOTA_CAUSE], { failed: 8, total: 20 })
    expect(mockReportFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'crawl.run_degraded',
        severity: 'error',
        fingerprint: ['crawl.run_degraded', 'llm_quota'],
      }),
    )
    expect(mockSendRunDegradedEmail).toHaveBeenCalledWith({
      title: 'Daily crawl degraded: 8 of 20 venues failed',
      lines: [describeDegradation(RATE), describeDegradation(QUOTA_CAUSE)],
    })
  })

  it('reports to Sentry before emailing, and survives the email throwing', async () => {
    mockSendRunDegradedEmail.mockRejectedValueOnce(new Error('resend down'))
    await expect(
      reportRunHealth([RATE], { failed: 8, total: 20 }),
    ).resolves.toBeUndefined()
    expect(mockReportFailure).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ event: 'crawl.run_degraded' }),
    )
    expect(mockReportFailure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ event: 'crawl.email_error' }),
    )
  })
})
