// Severity model and per-condition presentation config for the triage panel
// (#1215). Labels live in `components/admin/definitions/copy.ts`; this file
// carries only glyph, band ordering and deep-link intent.
//
// Three bands, not five, so red keeps meaning "not running":
//   hard    · danger   · Blocked, Crawl failing — the crawl is not running
//   loss    · warning  · Went dark, Coverage gap — it runs and drops events
//   suspect · accent-2 · Ceiling suspected — a pattern a human should look at
//
// The band a row belongs to arrives on the wire (`fault.band`) and is never
// re-derived here; CONDITION_META keeps `band` only so the icon/action lookup
// and the wire value can be cross-checked in tests.

import {
  ArrowUpToLine,
  Ban,
  Check,
  ChevronRight,
  Flag,
  Link2Off,
  OctagonAlert,
  Tag,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react'

import type { TriageAction, TriageBand, TriageCondition } from './types'

export const SEVERITY: Record<TriageBand, { rank: number; ink: string }> = {
  hard: { rank: 0, ink: 'var(--danger)' },
  loss: { rank: 1, ink: 'var(--warning)' },
  suspect: { rank: 2, ink: 'var(--accent-2, var(--accent))' },
}

export const BAND_KEYS: TriageBand[] = ['hard', 'loss', 'suspect']

export interface SeverityTint {
  ink: string
  fill: string
  edge: string
}

export const sevTint = (band: TriageBand): SeverityTint => {
  const { ink } = SEVERITY[band]
  return {
    ink,
    fill: `color-mix(in oklab, ${ink} 14%, transparent)`,
    edge: `color-mix(in oklab, ${ink} 34%, transparent)`,
  }
}

export type TriageGlyph =
  | 'blocked'
  | 'failed'
  | 'wentDark'
  | 'ceiling'
  | 'coverage'
  | 'flags'
  | 'prices'
  | 'check'
  | 'chevR'

export const CONDITION_META: Record<
  TriageCondition,
  { band: TriageBand; glyph: TriageGlyph; action: TriageAction }
> = {
  blocked: { band: 'hard', glyph: 'blocked', action: 'openVenue' },
  failed: { band: 'hard', glyph: 'failed', action: 'openRun' },
  wentDark: { band: 'loss', glyph: 'wentDark', action: 'openRun' },
  coverage: { band: 'loss', glyph: 'coverage', action: 'openVenue' },
  ceiling: { band: 'suspect', glyph: 'ceiling', action: 'openDiagnostics' },
}

export type TriageQueueKind = 'eventFlags' | 'priceSubmissions'

// The queue rows carry no `glyph` on the wire (queueSchema has no such field),
// so the mapping lives here rather than being read off the payload.
export const QUEUE_GLYPH: Record<TriageQueueKind, TriageGlyph> = {
  eventFlags: 'flags',
  priceSubmissions: 'prices',
}

// The handoff traced these nine glyphs by hand so the mock could stand alone;
// the header comment in `triage-icons.jsx` says production imports them from
// lucide-react, which is already a dependency. Real lucide paths, not the
// traced approximations, so the icons stay correct as lucide is upgraded.
export const GLYPH_ICONS: Record<TriageGlyph, LucideIcon> = {
  blocked: Ban,
  failed: OctagonAlert,
  wentDark: TrendingDown,
  ceiling: ArrowUpToLine,
  coverage: Link2Off,
  flags: Flag,
  prices: Tag,
  check: Check,
  chevR: ChevronRight,
}

// Faults beyond this many switch the tier to banded presentation. A prop on
// the panel so it can be moved without a code change here.
export const DENSE_AT = 7

// Tailwind `sm:` breakpoint — the panel's compact/desktop split.
export const TRIAGE_COMPACT_QUERY = '(max-width: 639px)'
