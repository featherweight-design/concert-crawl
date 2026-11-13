// Where each triage row goes when you click it.
//
// A run-scoped row opens the venue page's Runs tab (3b part 4). The crawl
// page's old inspector (`/admin/crawl?venueId=&tab=`) now redirects there and
// drops `tab`, and Diagnostics is dropped by ruling (A3 §3b row 8), so
// `openDiagnostics` and `openHistory` land on the same tab: the newest run is
// at the top, which for a currently-faulting venue is the run that produced
// the fault.
//
// There is deliberately no `run` parameter. When `crawlRunId` is null there
// is no run to look at, so the row degrades to the venue page's default tab.

import { venueTabHref } from '@/lib/admin/venue-tabs';
import { CONDITION_META } from '../definitions/meta';
import type { TriageFault, TriageQueue } from '../definitions/types';

const venuePath = (venueId: string): string => `/admin/venues/${venueId}`;

/**
 * Resolves a fault row's destination. `crawlRunId` is not interpolated into
 * the URL — it is only consulted to decide whether a run-scoped destination
 * is meaningful at all.
 */
export const faultHref = (fault: TriageFault): string => {
  const { action } = CONDITION_META[fault.condition];
  if (action === 'openVenue') return venuePath(fault.venueId);
  if (fault.crawlRunId === null) return venuePath(fault.venueId);
  return venueTabHref(fault.venueId, 'runs');
};

export const queueHref = (queue: TriageQueue): string =>
  queue.action === 'openReview'
    ? '/admin/needs-you'
    : '/admin/review?tab=submissions';
