'use client';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { relTimeAgo } from '@/components/consumer/lib/staleness';

const copy = CONSUMER_COPY.priceStaleness;

/**
 * The price age, "as of 3d ago". Shared so every price surface states it the
 * same way; Event Detail's multi-tier card had none, which is why the marker
 * showed on Watching but not on the event page (#1366).
 *
 * Addendum 4 item 5 (price-states-age-trust): plain subtle mono at every age.
 * The amber "could be stale" tone and dot are gone (Hugh dropped the stale
 * chip everywhere, 2026-11-10); past the threshold StillAccurateAction joins
 * the line instead.
 */
export function StaleStamp({
  observedAt,
}: {
  observedAt: string | null | undefined;
}) {
  if (!observedAt) return null;

  return (
    <span
      data-testid="price-age"
      style={{
        flexShrink: 0,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        fontWeight: 500,
        color: 'var(--price-text-subtle)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {copy.asOf(relTimeAgo(observedAt))}
    </span>
  );
}
