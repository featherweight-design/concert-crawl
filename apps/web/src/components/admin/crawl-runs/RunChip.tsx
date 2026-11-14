import type { CrawlRunReason, CrawlStatus } from '@concert-crawl/types';
import { VenueChip } from '@/components/admin/primitives';
import {
  runOutcome,
  runOutcomeKey,
  type RunOutcomeKey,
} from '@/components/admin/venues/overview/overview-rules';

/** Each chip's tone, as drawn. Grey chips read their word in the muted ink. */
export const RUN_CHIP_TONE: Record<RunOutcomeKey, string> = {
  success: 'var(--success)',
  unchanged: 'var(--fg-subtle)',
  partial: 'var(--warning)',
  failed: 'var(--danger)',
  blocked: 'var(--danger)',
  skipped: 'var(--fg-subtle)',
  robots: 'var(--warning)',
  notRun: 'var(--fg-subtle)',
};

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
