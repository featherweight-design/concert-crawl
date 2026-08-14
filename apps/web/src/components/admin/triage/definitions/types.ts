// Client-side mirror of the wire contract in
// apps/api/src/routes/admin/triage.ts (`triageResponseSchema`).
//
// The API is the authority; these types exist so the panel can be typed
// without importing the API package, and `lib/parse-triage.ts` is the runtime
// guard that proves an unknown payload matches them.

export type TriageBand = 'hard' | 'loss' | 'suspect'

export type TriageCondition =
  'blocked' | 'failed' | 'wentDark' | 'ceiling' | 'coverage'

export type TriageAction =
  'openRun' | 'openVenue' | 'openDiagnostics' | 'openReview' | 'openSubmissions'

interface TriageFaultBase {
  id: string
  venueId: string
  venue: string
  band: TriageBand
  persistedSince: string
  days: number
  dur: string
  crawlRunId: string | null
}

export interface BlockedEvidence {
  status: number | null
  refusals: number
  lastSuccess: string | null
}

export interface FailedEvidence {
  failures: number
  errorClass: string
  pauseAt: number
}

export interface WentDarkEvidence {
  count: number
  baselineCount: number
  avg: number
  pct: number
  window: number
  threshold: number
  series: number[]
}

export interface CeilingEvidence {
  kind: 'pinned_count' | 'horizon_shrank'
  count: number
  runs: number
  was: number | null
  wasWhen: string | null
  furthest: string | null
  best: string | null
  shrankDays: number | null
  series: number[]
}

export interface CoverageEvidence {
  matched: number
  expected: number
  uncovered: number
  wasWhen: string | null
}

export type TriageFault =
  | (TriageFaultBase & { condition: 'blocked'; evidence: BlockedEvidence })
  | (TriageFaultBase & { condition: 'failed'; evidence: FailedEvidence })
  | (TriageFaultBase & { condition: 'wentDark'; evidence: WentDarkEvidence })
  | (TriageFaultBase & { condition: 'ceiling'; evidence: CeilingEvidence })
  | (TriageFaultBase & { condition: 'coverage'; evidence: CoverageEvidence })

export interface TriageQueue {
  id: string
  kind: 'eventFlags' | 'priceSubmissions'
  count: number
  breakdown: string
  action: 'openReview' | 'openSubmissions'
}

export interface TriageSweep {
  venues: number
  at: string
  atIso: string | null
  events: number
  next: string
}

/**
 * The evidence figure an operator judged expected, and who judged it. The
 * fault re-fires the moment the figure moves, so this is provenance rather
 * than a dismissal.
 */
export interface FaultAcknowledgement {
  evidenceKind: 'pinned_count' | 'horizon_shrank' | null
  evidenceValue: string | null
  reason: string
  acknowledgedBy: string
  acknowledgedAt: string
}

export type AcknowledgedFault = TriageFault & {
  acknowledgement: FaultAcknowledgement
}

export interface TriageData {
  faults: TriageFault[]
  acknowledged: AcknowledgedFault[]
  queues: TriageQueue[]
  sweep: TriageSweep
}
