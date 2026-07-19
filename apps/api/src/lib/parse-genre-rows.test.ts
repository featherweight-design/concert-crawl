import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// Sentry mock must be hoisted before the module under test imports it,
// mirroring apps/api/src/routes/admin/prices.integration.test.ts:5-14.
vi.mock('@sentry/hono/node', async () => {
  const actual =
    await vi.importActual<typeof import('@sentry/hono/node')>(
      '@sentry/hono/node',
    )
  return {
    ...actual,
    captureMessage: vi.fn(),
  }
})

// apiLogger.warn is the local-log side of the signal; assert it fires so a
// developer tailing pino output still sees the drop even when Sentry is off.
// vi.hoisted keeps the spy reachable inside the also-hoisted vi.mock factory
// — a bare `const` isn't in scope when the mock factory evaluates.
const { warnSpy } = vi.hoisted(() => ({ warnSpy: vi.fn() }))
vi.mock('./logger.js', () => ({
  apiLogger: {
    warn: warnSpy,
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import * as Sentry from '@sentry/hono/node'
import { parseGenreRows } from './parse-genre-rows.js'

// Runtime schema for the aggregated Sentry `extra` payload — the tests
// need to inspect fields on an `unknown` return, and safeParse is the
// project-canonical alternative to an `as` cast for boundary reads.
const extraSchema = z.object({
  droppedCount: z.number(),
  totalRows: z.number(),
  sampleIssues: z.array(z.unknown()),
  sampleRows: z.array(
    z.object({
      genreValue: z.unknown(),
      genreType: z.string(),
      otherKeys: z.array(z.string()),
    }),
  ),
})

describe('parseGenreRows', () => {
  beforeEach(() => {
    warnSpy.mockClear()
    vi.mocked(Sentry.captureMessage).mockClear()
  })

  it('returns the genre string for every well-formed row and fires no signal', () => {
    const rows = [{ genre: 'rock' }, { genre: 'electronic' }, { genre: 'jazz' }]
    expect(parseGenreRows(rows)).toEqual(['rock', 'electronic', 'jazz'])
    expect(warnSpy).not.toHaveBeenCalled()
    expect(Sentry.captureMessage).not.toHaveBeenCalled()
  })

  it('drops a row with the wrong shape and fires BOTH apiLogger.warn and Sentry.captureMessage', () => {
    // A driver regression could produce a null / number / missing-genre row.
    // The whole point of #1108 is that the drop can't be silent.
    const rows: unknown[] = [
      { genre: 'rock' },
      { genre: null },
      { genre: 'electronic' },
    ]
    expect(parseGenreRows(rows)).toEqual(['rock', 'electronic'])

    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)

    const [message, options] =
      vi.mocked(Sentry.captureMessage).mock.calls[0] ?? []
    expect(message).toMatch(/events\/genres/)
    expect(options).toMatchObject({
      level: 'warning',
      tags: { genres_parse_drop: '1' },
    })
    const extra = extraSchema.parse(options?.extra)
    expect(extra.droppedCount).toBe(1)
    expect(extra.totalRows).toBe(3)
    // The failing row was { genre: null } — the sample MUST expose the
    // actual genre value + its runtime type so a real driver
    // regression is diagnosable straight from the Sentry event.
    expect(extra.sampleRows).toEqual([
      { genreValue: null, genreType: 'null', otherKeys: [] },
    ])
  })

  it('aggregates multiple drops into ONE signal per request so an incident cannot storm Sentry', () => {
    // /v1/events/genres runs on every browse-page load. If a driver
    // regression breaks every row (~85 in prod), we cannot afford one
    // Sentry event per row per pageview during the outage — collapse
    // to a single tagged event that carries the count.
    const rows: unknown[] = [
      { genre: null },
      { genre: 'rock' },
      { notGenre: 'oops' },
      { genre: 42 },
    ]
    expect(parseGenreRows(rows)).toEqual(['rock'])
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)

    const [, options] = vi.mocked(Sentry.captureMessage).mock.calls[0] ?? []
    const extra = extraSchema.parse(options?.extra)
    expect(extra.droppedCount).toBe(3)
    expect(extra.totalRows).toBe(4)
    // Row samples name each failure mode distinctly — null value,
    // missing key (surfaces as otherKeys: ['notGenre']), wrong type.
    expect(extra.sampleRows).toEqual([
      { genreValue: null, genreType: 'null', otherKeys: [] },
      {
        genreValue: undefined,
        genreType: 'undefined',
        otherKeys: ['notGenre'],
      },
      { genreValue: 42, genreType: 'number', otherKeys: [] },
    ])
  })

  it('samples issues and rows for the operator without shipping every failure body', () => {
    // Cap the sample so a 100-row failure still produces a compact
    // signal — same-shape failures are near-identical so a small
    // sample is enough to diagnose.
    const rows: unknown[] = Array.from({ length: 10 }, () => ({ genre: null }))
    expect(parseGenreRows(rows)).toEqual([])
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)

    const [, options] = vi.mocked(Sentry.captureMessage).mock.calls[0] ?? []
    const extra = extraSchema.parse(options?.extra)
    // The exact cap is an implementation detail (currently 3); assert
    // that we counted them all but shipped fewer than the count.
    expect(extra.droppedCount).toBe(10)
    expect(extra.sampleIssues.length).toBeLessThan(10)
    expect(extra.sampleIssues.length).toBeGreaterThan(0)
    expect(extra.sampleRows.length).toBe(extra.sampleIssues.length)
  })

  it('handles an empty input without firing anything', () => {
    expect(parseGenreRows([])).toEqual([])
    expect(warnSpy).not.toHaveBeenCalled()
    expect(Sentry.captureMessage).not.toHaveBeenCalled()
  })
})
