import type { CrawlRunReason, CrawlStatus } from '@concert-crawl/types';
import { StatusBadge } from '@/components/admin/primitives';
import { crawlStatusKind } from '@/components/admin/definitions/crawl-status';
import { runOutcome } from '@/components/admin/venues/overview/overview-rules';

/**
 * A run's result chip (`09/run-result-chips`): the outcome word the Overview
 * reads (OK, Unchanged, Partial, Failed, Skipped) in its status's colour from
 * the one crawl-status map. Low is HOLD (it needs What's normal).
 */
export const RunChip = ({
  run,
}: {
  run: { status: CrawlStatus; reason: CrawlRunReason | null };
}) => (
  <StatusBadge kind={crawlStatusKind(run.status)} dot>
    {runOutcome(run)}
  </StatusBadge>
);
