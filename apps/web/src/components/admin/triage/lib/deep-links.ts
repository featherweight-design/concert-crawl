// Where each triage row goes when you click it.
//
// Every target here already exists — no new route and no new query parameter
// was added for this panel. The crawl page's inspector reads `?venueId=` and
// `?tab=`, and `InspectorTab` is `'overview' | 'diagnostics' | 'history'`, so
// `history` and `diagnostics` are the real tab values.
//
// There is deliberately no `runId` parameter. The inspector's history tab
// opens on the venue's most recent run, which for a currently-faulting venue
// is the run that produced the fault. When `crawlRunId` is null there is no
// run to open at all, so the row degrades to the venue's admin page rather
// than to a crawl page that would show an empty inspector.

import { CONDITION_META } from '../definitions/meta'
import type { TriageFault, TriageQueue } from '../definitions/types'

const venuePath = (venueId: string): string => `/admin/venues/${venueId}`

const inspectorPath = (
  venueId: string,
  tab: 'history' | 'diagnostics',
): string => `/admin/crawl?venueId=${encodeURIComponent(venueId)}&tab=${tab}`

/**
 * Resolves a fault row's destination. `crawlRunId` is not interpolated into
 * the URL — it is only consulted to decide whether a run-scoped destination
 * is meaningful at all.
 */
export const faultHref = (fault: TriageFault): string => {
  const { action } = CONDITION_META[fault.condition]
  if (action === 'openVenue') return venuePath(fault.venueId)
  if (fault.crawlRunId === null) return venuePath(fault.venueId)
  return inspectorPath(
    fault.venueId,
    action === 'openDiagnostics' ? 'diagnostics' : 'history',
  )
}

export const queueHref = (queue: TriageQueue): string =>
  queue.action === 'openReview' ? '/admin/review' : '/admin/prices/submissions'
