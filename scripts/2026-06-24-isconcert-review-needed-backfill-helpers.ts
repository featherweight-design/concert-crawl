/**
 * Pure helpers for the isConcert-review-needed backfill script.
 * Extracted so the test file can import them without pulling in the
 * Anthropic SDK or @concert-crawl/db. Mirrors the structure of
 * scripts/2026-06-19-non-concert-backfill-helpers.ts.
 */

export type BackfillAction =
  | 'flag-for-review'
  | 'unflag'
  | 'disagrees-with-prior'

export interface EventForClassification {
  id: string
  title: string
  artist: string
  description: string | null
  date: string
  venueName: string
  currentHidden: boolean
  currentReviewNeeded: boolean
}

export interface ClassificationResult {
  eventId: string
  title: string
  artist: string
  date: string
  venueName: string
  currentHiddenFromConsumer: boolean
  llmIsConcert: boolean
  llmReviewNeeded: boolean
  action: BackfillAction
}

export interface BatchClassification {
  eventId: string
  isConcert: boolean
  reviewNeeded: boolean
}

export function buildBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = []
  for (let idx = 0; idx < items.length; idx += batchSize) {
    batches.push(items.slice(idx, idx + batchSize))
  }
  return batches
}

export function classifyAction(input: {
  currentHidden: boolean
  llmIsConcert: boolean
  llmReviewNeeded: boolean
}): BackfillAction {
  // disagrees-with-prior takes precedence over flag/unflag: the row is
  // currently hidden, but the LLM now thinks it's a concert. Surface this
  // for the human reviewer to consider applying Mark-as-concert post-
  // commit. The script itself NEVER auto-unhides.
  if (input.currentHidden && input.llmIsConcert) return 'disagrees-with-prior'
  return input.llmReviewNeeded ? 'flag-for-review' : 'unflag'
}

// Defends against CSV formula injection (=, +, -, @ leading chars get
// interpreted as formulas in Excel/Sheets when an operator opens the
// dry-run CSV). Prefix a single quote so spreadsheet apps treat the cell
// as literal text. Applied to every string-typed column (event titles,
// artist names, venue names can all originate from untrusted scraped
// content). See OWASP "CSV Injection".
export function neutralizeFormula(val: string): string {
  if (val.length === 0) return val
  const firstChar = val.charCodeAt(0)
  // = + - @ in ASCII = 0x3D, 0x2B, 0x2D, 0x40
  if (
    firstChar === 0x3d ||
    firstChar === 0x2b ||
    firstChar === 0x2d ||
    firstChar === 0x40
  ) {
    return `'${val}`
  }
  return val
}

export function formatCsvRow(result: ClassificationResult): string {
  const escape = (val: string): string => {
    const safe = neutralizeFormula(val)
    if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
      return `"${safe.replace(/"/g, '""')}"`
    }
    return safe
  }
  return (
    [
      result.eventId,
      escape(result.title),
      escape(result.artist),
      result.date,
      escape(result.venueName),
      String(result.currentHiddenFromConsumer),
      String(result.llmIsConcert),
      String(result.llmReviewNeeded),
      result.action,
    ].join(',') + '\n'
  )
}
