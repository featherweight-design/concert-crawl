'use client';

import type { VenueWithCrawlHealth } from '@concert-crawl/types';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import { RelTime, StatusBadge } from '@/components/admin/primitives';

const COPY = ADMIN_COPY.venueHeader.summary;
const SUMMARY = ADMIN_COPY.venueDetailsClient.summary;

type Strategy = keyof typeof COPY.strategy;

const strategyOf = (strategy: string | null): Strategy =>
  strategy === 'structured_data' || strategy === 'llm' || strategy === 'manual'
    ? strategy
    : 'auto';

const strategyKind = (strategy: Strategy): 'signal' | 'accent' | 'neutral' => {
  if (strategy === 'structured_data') return 'signal';
  if (strategy === 'llm') return 'accent';
  return 'neutral';
};

/**
 * The crawl summary the old header card carried: extraction strategy,
 * consecutive failures, last crawl, events live and 7-day health. Kept as a
 * compact line under `VenueHeader` so none of it disappears in the lift.
 *
 * TODO(3a part 5): the Overview tab takes these over; delete this line then.
 */
export const VenueSummaryLine = ({
  venue,
}: {
  venue: Pick<
    VenueWithCrawlHealth,
    'extractionStrategy' | 'consecutiveFailures' | 'crawlHealth'
  >;
}) => {
  const strategy = strategyOf(venue.extractionStrategy);
  const { crawlHealth } = venue;
  return (
    <div
      data-testid="venue-summary-line"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: 'var(--fg-muted)',
      }}
    >
      <StatusBadge kind={strategyKind(strategy)} variant="outline">
        {COPY.strategy[strategy]}
      </StatusBadge>
      {venue.consecutiveFailures > 0 && (
        <StatusBadge kind="danger">
          {COPY.consecutiveFailures(venue.consecutiveFailures)}
        </StatusBadge>
      )}
      <span>
        {SUMMARY.lastCrawl}{' '}
        {crawlHealth.lastCrawledAt ? (
          <RelTime iso={crawlHealth.lastCrawledAt} />
        ) : (
          SUMMARY.never
        )}
      </span>
      <span aria-hidden>·</span>
      <span>
        {crawlHealth.eventsTracked} {SUMMARY.eventsLive}
      </span>
      <span aria-hidden>·</span>
      <span>
        {SUMMARY.health} {crawlHealth.sevenDayPercent}%
      </span>
    </div>
  );
};
