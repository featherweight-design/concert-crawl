import { PageSkeleton } from '@/components/admin/primitives';

/**
 * The Events list loading. Desktop is `07/loading-events`: the title and
 * subtitle, the search with five filter pills in one row, then the table
 * card's rows. The phone is `07/loading-any-list-on-mobile`: no heading (the
 * shell's top bar names the page), a full-width search over three pills, then
 * seven plain 68px rows (44px thumb, 12px padding above and below).
 *
 * Both render and the admin breakpoint (ADMIN_PHONE_MAX_WIDTH) shows one, so
 * `loading.tsx` can draw it on the server, where useIsPhone can't run.
 * `rowsOnly` is the in-flight state under the live filter row: rows alone.
 */
export const EventsSkeleton = ({
  rowsOnly = false,
}: {
  rowsOnly?: boolean;
}) => (
  <>
    <div
      className="events-skeleton-desktop"
      data-testid="events-skeleton-desktop"
    >
      <PageSkeleton
        heading={!rowsOnly}
        inlineSearch={!rowsOnly}
        card
        filters={rowsOnly ? 0 : 5}
        rows={8}
        columns={5}
        rowHeight={65}
      />
    </div>
    <div className="events-skeleton-phone" data-testid="events-skeleton-phone">
      <PageSkeleton
        search={!rowsOnly}
        filters={rowsOnly ? 0 : 3}
        rows={7}
        // Plain rows draw columns - 2 tail pills; the board draws one tail.
        columns={3}
        rowHeight={68}
      />
    </div>
  </>
);
