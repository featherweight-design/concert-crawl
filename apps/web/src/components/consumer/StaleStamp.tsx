'use client';

import { CONSUMER_COPY } from '@/components/consumer/definitions/copy';
import { relTimeAgo } from '@/components/consumer/lib/staleness';

const copy = CONSUMER_COPY.priceStaleness;

/**
 * The price age, "as of 3d ago". Shared so every price surface states it the
 * same way; Event Detail's multi-tier card had none, which is why the marker
 * showed on Watching but not on the event page (#1366).
 *
 * Plain subtle mono at every age. The amber "could be stale" tone and dot are
 * gone (Hugh dropped the stale chip everywhere, 2026-11-10; addendum 4 item 5);
 * past the threshold StillAccurateAction joins the line instead.
 *
 * - `inline` (default): inside another mono line, lowercase, "as of 3d ago".
 * - `line`: the price card's own age line (price-states-age-trust), 0.06em
 *   caps with the unit spelled out, "AS OF 3 DAYS AGO". Copy-review: in caps
 *   "3D" reads as three-dimensional.
 */
export function StaleStamp({
  observedAt,
  variant = 'inline',
}: {
  observedAt: string | null | undefined;
  variant?: 'inline' | 'line';
}) {
  if (!observedAt) return null;
  const isLine = variant === 'line';

  return (
    <span
      data-testid="price-age"
      style={{
        flexShrink: 0,
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--price-text-subtle)',
        ...(isLine
          ? {
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
            }
          : { letterSpacing: '0.04em' }),
      }}
    >
      {copy.asOf(relTimeAgo(observedAt, { long: isLine }))}
    </span>
  );
}
