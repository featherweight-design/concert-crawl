import type { CrawlRunReason, CrawlStatus } from '@concert-crawl/types';
import { VenueChip } from '@/components/admin/primitives';
import {
  RUN_OUTCOME_TONE,
  runOutcome,
  runOutcomeKey,
} from '@/components/admin/venues/overview/overview-rules';

/**
 * Each chip's tone, as drawn: the one outcome-tone map in overview-rules,
 * shared with Needs you's LAST 4 RUNS. Grey chips read their word in the
 * muted ink.
 */
export const RUN_CHIP_TONE = RUN_OUTCOME_TONE;

/**
 * A run's result chip (`A3/09/run-result-chips`, `B+/A5/14/run-chips-partial`):
 * OK (success), Unchanged (grey), Partial (amber), Failed (danger), Blocked
 * (danger, a 403 or 429), Skipped (grey), robots.txt (amber) and Not run
 * (grey, the account-wide LLM refusal), on the venue chip. Low and Quiet are
 * HOLD (they need What's normal).
 */
export const RunChip = ({
  run,
}: {
  run: { status: CrawlStatus; reason: CrawlRunReason | null };
}) => (
  <VenueChip
    tone={RUN_CHIP_TONE[runOutcomeKey(run)]}
    label={runOutcome(run)}
    testId="run-chip"
  />
);
