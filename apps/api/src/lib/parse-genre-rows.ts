import { z, type ZodIssue } from 'zod'
import * as Sentry from '@sentry/hono/node'
import { apiLogger } from './logger.js'

const genreRowSchema = z.object({ genre: z.string() })

// Cap how many samples we forward in the aggregated signal. A driver
// regression tends to fail every row for the SAME reason, so 3 rows are
// enough to diagnose without paging through hundreds of identical
// entries during an incident.
const SAMPLE_SIZE = 3

// A raw-row summary trimmed for the Sentry extras. Knowing the actual
// genre value + its runtime type is what makes a driver regression fast
// to triage; `otherKeys` catches the "column got renamed" case where
// the row has content but no `genre` at all.
interface RowSample {
  genreValue: unknown
  genreType: string
  otherKeys: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function summarizeRow(row: unknown): RowSample {
  if (!isRecord(row)) {
    return {
      genreValue: undefined,
      genreType: row === null ? 'null' : typeof row,
      otherKeys: [],
    }
  }
  const genreValue = row['genre']
  return {
    genreValue,
    genreType: genreValue === null ? 'null' : typeof genreValue,
    otherKeys: Object.keys(row).filter((key) => key !== 'genre'),
  }
}

/**
 * Turn the raw `db.execute()` output for the /v1/events/genres endpoint
 * into a plain string[] of genre values. Rows that don't match the
 * expected `{ genre: string }` shape are dropped AND signalled — via
 * apiLogger.warn (local pino) and Sentry.captureMessage (paged alert
 * surface). The endpoint's SELECT projection is stable, so any drop
 * means a driver regression or an unexpected null from unnest; silence
 * would degrade the Vibe filter without warning (#1108).
 *
 * The signal is aggregated to ONE warn + ONE captureMessage per request
 * even when many rows fail, so a driver regression can't turn a single
 * browse-page load into a Sentry / log storm. `genres_parse_drop: '1'`
 * is the stable Sentry alert tag — mirrors the
 * `endpoint_lockout: 'contest_row'` pattern in routes/admin/prices.ts.
 */
export function parseGenreRows(rows: Iterable<unknown>): string[] {
  const rawGenres: string[] = []
  // Stream-cap the samples at SAMPLE_SIZE so a mass-failure incident
  // doesn't grow per-request memory linearly with the DB size — only
  // the first few failing rows are retained; later ones bump the
  // counter without any allocation.
  const sampleIssues: ZodIssue[][] = []
  const sampleRows: unknown[] = []
  let totalRows = 0
  let droppedCount = 0
  for (const row of rows) {
    totalRows += 1
    const parsed = genreRowSchema.safeParse(row)
    if (parsed.success) {
      rawGenres.push(parsed.data.genre)
      continue
    }
    droppedCount += 1
    if (sampleIssues.length < SAMPLE_SIZE) {
      sampleIssues.push(parsed.error.issues)
      sampleRows.push(row)
    }
  }
  if (droppedCount > 0) {
    const payload = {
      droppedCount,
      totalRows,
      sampleIssues,
      // Row summaries carry the actual genre value + its runtime type so
      // a driver regression (column rename, unexpected null, wrong type)
      // is diagnosable straight from the Sentry event.
      sampleRows: sampleRows.map(summarizeRow),
    }
    apiLogger.warn(
      payload,
      'events/genres: rows failed genreRowSchema — dropped',
    )
    Sentry.captureMessage(
      'events/genres: rows failed genreRowSchema — dropped',
      {
        level: 'warning',
        tags: { genres_parse_drop: '1' },
        extra: payload,
      },
    )
  }
  return rawGenres
}
