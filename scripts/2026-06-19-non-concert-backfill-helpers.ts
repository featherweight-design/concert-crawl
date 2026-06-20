/**
 * Pure helpers for the non-concert backfill script (#696). Extracted so the
 * test file can import them without pulling in @anthropic-ai/sdk,
 * drizzle-orm, or @concert-crawl/db — those live in the main script file.
 *
 * No external dependencies; tests can run from any context.
 */

export interface EventForClassification {
  id: string
  title: string
  artist: string
  description: string | null
  date: string
  venueName: string
  currentHidden: boolean
}

export interface ClassificationResult {
  eventId: string
  title: string
  artist: string
  date: string
  venueName: string
  currentHidden: boolean
  llmIsConcert: boolean
  wouldChange: boolean
}

export interface BatchClassification {
  eventId: string
  isConcert: boolean
}

export function buildBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let idx = 0; idx < items.length; idx += batchSize) {
    batches.push(items.slice(idx, idx + batchSize))
  }
  return batches
}

export function formatCsvRow(result: ClassificationResult): string {
  const escape = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  return (
    [
      result.eventId,
      escape(result.title),
      escape(result.artist),
      result.date,
      escape(result.venueName),
      String(result.currentHidden),
      String(result.llmIsConcert),
      String(result.wouldChange),
    ].join(',') + '\n'
  )
}
