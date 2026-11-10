// Turns a fault's `evidence` object into the two strings the row renders —
// the mono `stat` that earns the row, and the prose `detail` that gives the
// figure meaning — plus the optional micro-chart series.
//
// This is the one place that reads evidence fields, so it is the one place a
// null can leak into a template literal. Every nullable field on the wire
// (`blocked.status`, `blocked.lastSuccess`, `ceiling.was`, `ceiling.wasWhen`,
// `ceiling.furthest`, `ceiling.best`, `ceiling.shrankDays`, `coverage.wasWhen`)
// is handled by choosing a different sentence in `copy.ts`, never by
// interpolating the value and hoping.
//
// The `switch` is exhaustive over the discriminated union: a sixth condition
// would fail typecheck here rather than render blank. Rows the parser did not
// recognise never reach this function at all.

import { ADMIN_COPY } from '../../definitions/copy';
import type { TriageFault } from '../definitions/types';

const EV = ADMIN_COPY.triage.evidence;

// The API's account-wide classes (`classifyCrawlError` in admin/lib/triage.ts),
// which carry the crawler's own kinds.
const ACCOUNT_WIDE_ERROR_CLASSES = new Set(['llm_quota', 'llm_rate_limit']);

export interface EvidenceLines {
  stat: string;
  detail: string;
  /**
   * Present only for the two conditions whose evidence is a trend rather
   * than a single reading. Production emits between one and seven entries —
   * a venue that has only been crawled twice yields a two-bar chart, and the
   * chart must survive that.
   */
  series?: number[];
}

export const evidenceLines = (fault: TriageFault): EvidenceLines => {
  switch (fault.condition) {
    case 'blocked': {
      const { status, refusals, lastSuccess } = fault.evidence;
      return {
        stat: EV.blockedStat(status),
        detail: EV.blockedDetail(refusals, lastSuccess),
      };
    }
    case 'failed': {
      const { failures, errorClass, pauseAt } = fault.evidence;
      if (ACCOUNT_WIDE_ERROR_CLASSES.has(errorClass)) {
        return {
          stat: EV.failedAccountWideStat,
          detail: EV.failedAccountWideDetail(errorClass),
        };
      }
      return {
        stat: EV.failedStat(failures),
        detail: EV.failedDetail(errorClass, pauseAt),
      };
    }
    case 'wentDark': {
      const { count, baselineCount, avg, pct, threshold, series } =
        fault.evidence;
      return {
        stat: EV.wentDarkStat(baselineCount, count),
        // The window is the number of runs actually plotted, not the
        // `evidence.window` constant — a venue with three baseline runs
        // must not be described as having a seven-run average.
        detail: EV.wentDarkDetail(pct, series.length, avg, threshold),
        series,
      };
    }
    case 'ceiling': {
      const { kind, count, runs, was, wasWhen, furthest, best, shrankDays } =
        fault.evidence;
      if (kind === 'horizon_shrank') {
        return {
          stat: EV.ceilingHorizonStat(furthest, count),
          detail: EV.ceilingHorizonDetail(shrankDays, best),
          series: fault.evidence.series,
        };
      }
      return {
        stat: EV.ceilingPinnedStat(count),
        detail: EV.ceilingPinnedDetail(runs, was, wasWhen),
        series: fault.evidence.series,
      };
    }
    case 'coverage': {
      const { matched, expected, uncovered, wasWhen } = fault.evidence;
      return {
        stat: EV.coverageStat(matched, expected),
        detail: EV.coverageDetail(uncovered, wasWhen),
      };
    }
  }
};
