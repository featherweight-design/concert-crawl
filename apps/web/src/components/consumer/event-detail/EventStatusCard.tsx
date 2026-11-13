// The event page's status card: No longer listed, Cancelled, Postponed or Sold
// out. ONE component for the signed-in page and the public share page at /e/:id
// (B+ addendum 3, "Status card on the public share page"): the public page
// draws the same card, read-only, with no Watching action. The card itself has
// never carried an action (the report banners, sheets and CTAs live beside it
// in EventDetailBanners), so `readOnly` marks the surface rather than removing
// anything; the signed-in page leaves it off.
import type { EventDetailResponse } from '@concert-crawl/types';

import { NoLongerListedCard } from '@/components/consumer/event-detail/NoLongerListedCard';
import { isDelisted } from '@/components/consumer/event-row/lib/row-status';
import { LiveReportBanner } from '@/components/consumer/reporting/LiveReportBanner';
import { REPORTING_COPY } from '@/components/consumer/reporting/definitions/copy';

export type LiveStatus = 'cancelled' | 'postponed' | 'sold-out';

type StatusCardEvent = Pick<
  EventDetailResponse,
  | 'status'
  | 'priceStatus'
  | 'delistedAt'
  | 'updatedAt'
  | 'soldOutReport'
  | 'statusReport'
  | 'statusSource'
>;

/**
 * The live (promoted) status the card shows, or null. Promoted status is
 * reflected in `event.status`: a No longer listed show is excluded because it
 * has its own card.
 */
export const liveStatusOf = (event: StatusCardEvent): LiveStatus | null => {
  if (isDelisted(event.status, event.delistedAt)) return null;
  if (event.status === 'cancelled') return 'cancelled';
  if (event.status === 'postponed') return 'postponed';
  if (event.priceStatus === 'soldout') return 'sold-out';
  return null;
};

export interface EventStatusCardProps {
  event: StatusCardEvent;
  /**
   * Who handles a cancelled show's refund: the vendor (a ticket URL) or the
   * venue (only its page). Picks the card's second sentence.
   */
  cancelledRefund?: 'vendor' | 'venue';
  /** The public share page: same card, marked read-only. */
  readOnly?: boolean;
}

export const EventStatusCard = ({
  event,
  cancelledRefund = 'vendor',
  readOnly = false,
}: EventStatusCardProps) => {
  const delisted = isDelisted(event.status, event.delistedAt);
  const live = liveStatusOf(event);
  if (!delisted && live === null) return null;

  // The promoted fan report behind the live status: sold out's own report, or
  // the one behind a cancelled or postponed status. With none, the status
  // came from the venue's calendar (or an admin) and the card says so.
  const fanReport =
    live === 'sold-out'
      ? (event.soldOutReport ?? null)
      : live !== null
        ? (event.statusReport ?? null)
        : null;
  // Read-only is the public page: an anonymous visitor never sees a fan's
  // handle. The handle-free "{n} confirms · {age}" line stands in.
  const reporter =
    !readOnly && fanReport?.reporterHandle != null
      ? { handle: fanReport.reporterHandle, url: '' }
      : null;
  // A fan report dates the card from when it was filed. Otherwise it falls
  // back to the event's last update.
  const since = fanReport?.reportedAt ?? event.updatedAt;
  const copy = REPORTING_COPY.liveReportBanner;

  return (
    <div data-testid="event-status-card" data-read-only={readOnly}>
      {delisted && <NoLongerListedCard delistedAt={event.delistedAt} />}
      {live !== null && (
        <LiveReportBanner
          status={live}
          promotedAt={since}
          {...(fanReport !== null
            ? { confirmCount: fanReport.confirmsCount }
            : {})}
          reporter={reporter}
          {...(fanReport === null && event.statusSource === 'admin'
            ? { adminConfirmed: true }
            : {})}
          body={
            live === 'cancelled'
              ? copy.cancelledBody[cancelledRefund]
              : live === 'postponed'
                ? readOnly
                  ? copy.postponedBodyReadOnly
                  : copy.postponedBody
                : readOnly
                  ? copy.soldOutBodyReadOnly
                  : copy.soldOutBody
          }
        />
      )}
    </div>
  );
};
