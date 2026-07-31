// Runtime guards for the GET /v1/admin/triage payload.
//
// Two properties matter more than exhaustive validation:
//
// 1. **Rows are parsed individually.** New alert categories get added
//    crawler-side. If the API grows a sixth condition, a whole-payload
//    discriminated-union parse would reject everything and the panel would
//    render blank — trading a white screen for an empty one. Unrecognised
//    rows are dropped and the rest of the panel still renders.
// 2. **Nullable fields must be present.** An absent key reads as `undefined`
//    and interpolates the literal string "undefined"; the API declares these
//    as explicitly-null, so the guard requires the key.
//
// `apps/web` has no Zod dependency (server-side validation lives in the API),
// so these are hand-written guards. No casts — every narrowing is a check.

import type {
  BlockedEvidence,
  CeilingEvidence,
  CoverageEvidence,
  FailedEvidence,
  TriageData,
  TriageFault,
  TriageQueue,
  TriageSweep,
  WentDarkEvidence,
} from '../definitions/types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isNullableString = (value: unknown): value is string | null =>
  value === null || isString(value)

const isNullableNumber = (value: unknown): value is number | null =>
  value === null || isNumber(value)

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every(isNumber)

const isBand = (
  value: unknown,
): value is TriageData['faults'][number]['band'] =>
  value === 'hard' || value === 'loss' || value === 'suspect'

const parseBlocked = (raw: unknown): BlockedEvidence | null => {
  if (!isRecord(raw)) return null
  const { status, refusals, lastSuccess } = raw
  if (!isNullableNumber(status)) return null
  if (!isNumber(refusals)) return null
  if (!isNullableString(lastSuccess)) return null
  return { status, refusals, lastSuccess }
}

const parseFailed = (raw: unknown): FailedEvidence | null => {
  if (!isRecord(raw)) return null
  const { failures, errorClass, pauseAt } = raw
  if (!isNumber(failures)) return null
  if (!isString(errorClass)) return null
  if (!isNumber(pauseAt)) return null
  return { failures, errorClass, pauseAt }
}

const parseWentDark = (raw: unknown): WentDarkEvidence | null => {
  if (!isRecord(raw)) return null
  const { count, baselineCount, avg, pct, window, threshold, series } = raw
  if (!isNumber(count)) return null
  if (!isNumber(baselineCount)) return null
  if (!isNumber(avg)) return null
  if (!isNumber(pct)) return null
  if (!isNumber(window)) return null
  if (!isNumber(threshold)) return null
  if (!isNumberArray(series)) return null
  return { count, baselineCount, avg, pct, window, threshold, series }
}

const parseCeiling = (raw: unknown): CeilingEvidence | null => {
  if (!isRecord(raw)) return null
  const {
    kind,
    count,
    runs,
    was,
    wasWhen,
    furthest,
    best,
    shrankDays,
    series,
  } = raw
  if (kind !== 'pinned_count' && kind !== 'horizon_shrank') return null
  if (!isNumber(count)) return null
  if (!isNumber(runs)) return null
  if (!isNullableNumber(was)) return null
  if (!isNullableString(wasWhen)) return null
  if (!isNullableString(furthest)) return null
  if (!isNullableString(best)) return null
  if (!isNullableNumber(shrankDays)) return null
  if (!isNumberArray(series)) return null
  return { kind, count, runs, was, wasWhen, furthest, best, shrankDays, series }
}

const parseCoverage = (raw: unknown): CoverageEvidence | null => {
  if (!isRecord(raw)) return null
  const { matched, expected, uncovered, wasWhen } = raw
  if (!isNumber(matched)) return null
  if (!isNumber(expected)) return null
  if (!isNumber(uncovered)) return null
  if (!isNullableString(wasWhen)) return null
  return { matched, expected, uncovered, wasWhen }
}

interface FaultBaseFields {
  id: string
  venueId: string
  venue: string
  band: 'hard' | 'loss' | 'suspect'
  persistedSince: string
  days: number
  dur: string
  crawlRunId: string | null
}

const parseFaultBase = (
  raw: Record<string, unknown>,
): FaultBaseFields | null => {
  const { id, venueId, venue, band, persistedSince, days, dur, crawlRunId } =
    raw
  if (!isString(id)) return null
  if (!isString(venueId)) return null
  if (!isString(venue)) return null
  if (!isBand(band)) return null
  if (!isString(persistedSince)) return null
  if (!isNumber(days)) return null
  if (!isString(dur)) return null
  if (!isNullableString(crawlRunId)) return null
  return { id, venueId, venue, band, persistedSince, days, dur, crawlRunId }
}

export const parseFault = (raw: unknown): TriageFault | null => {
  if (!isRecord(raw)) return null
  const base = parseFaultBase(raw)
  if (base === null) return null
  const { condition, evidence } = raw

  if (condition === 'blocked') {
    const parsed = parseBlocked(evidence)
    return parsed === null ? null : { ...base, condition, evidence: parsed }
  }
  if (condition === 'failed') {
    const parsed = parseFailed(evidence)
    return parsed === null ? null : { ...base, condition, evidence: parsed }
  }
  if (condition === 'wentDark') {
    const parsed = parseWentDark(evidence)
    return parsed === null ? null : { ...base, condition, evidence: parsed }
  }
  if (condition === 'ceiling') {
    const parsed = parseCeiling(evidence)
    return parsed === null ? null : { ...base, condition, evidence: parsed }
  }
  if (condition === 'coverage') {
    const parsed = parseCoverage(evidence)
    return parsed === null ? null : { ...base, condition, evidence: parsed }
  }
  // An unrecognised condition — a sixth alert category shipped crawler-side
  // ahead of the panel. Dropped, never thrown on.
  return null
}

export const parseQueue = (raw: unknown): TriageQueue | null => {
  if (!isRecord(raw)) return null
  const { id, kind, count, breakdown, action } = raw
  if (!isString(id)) return null
  if (kind !== 'eventFlags' && kind !== 'priceSubmissions') return null
  if (!isNumber(count)) return null
  if (!isString(breakdown)) return null
  if (action !== 'openReview' && action !== 'openSubmissions') return null
  return { id, kind, count, breakdown, action }
}

export const parseSweep = (raw: unknown): TriageSweep | null => {
  if (!isRecord(raw)) return null
  const { venues, at, atIso, events, next } = raw
  if (!isNumber(venues)) return null
  if (!isString(at)) return null
  if (!isNullableString(atIso)) return null
  if (!isNumber(events)) return null
  if (!isString(next)) return null
  return { venues, at, atIso, events, next }
}

/**
 * Parses a raw triage payload. Returns `null` only when the envelope itself is
 * unusable — an unrecognised fault or queue row is dropped and the rest of the
 * panel still renders. Fault order is the server's (band, then persistence);
 * it is never re-sorted here.
 */
export const parseTriageResponse = (raw: unknown): TriageData | null => {
  if (!isRecord(raw)) return null
  const { faults, queues, sweep } = raw
  if (!Array.isArray(faults)) return null
  if (!Array.isArray(queues)) return null
  const parsedSweep = parseSweep(sweep)
  if (parsedSweep === null) return null

  const parsedFaults: TriageFault[] = []
  for (const fault of faults) {
    const parsed = parseFault(fault)
    if (parsed !== null) parsedFaults.push(parsed)
  }

  const parsedQueues: TriageQueue[] = []
  for (const queue of queues) {
    const parsed = parseQueue(queue)
    if (parsed !== null) parsedQueues.push(parsed)
  }

  return { faults: parsedFaults, queues: parsedQueues, sweep: parsedSweep }
}
