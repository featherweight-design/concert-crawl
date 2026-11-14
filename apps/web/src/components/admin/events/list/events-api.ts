/**
 * The Events list's call (`GET /v1/admin/events/list`), from the browser with
 * the Clerk token, through the invite codes admin's `call`. The payload is
 * narrowed with type guards, so a shape drift fails into Couldn't load rather
 * than into a blank row.
 */
import {
  call,
  isCount,
  isRecord,
  isText,
  isTextOrNull,
  type GetToken,
} from '../../invite-codes/codes-api';
import {
  apiParams,
  isEventListStatus,
  type EventFilters,
  type EventListStatus,
} from './events-rules';

export type HiddenReason = 'unsure' | 'admin';

export interface EventListRow {
  id: string;
  title: string;
  /** `YYYY-MM-DD`, Mountain Time. */
  date: string;
  venueName: string | null;
  /** Picks the venue's icon tile. */
  venueSlug: string | null;
  status: EventListStatus;
  hidden: boolean;
  hiddenReason: HiddenReason | null;
  priceMin: string | null;
  priceMax: string | null;
  watchingCount: number;
  /** The Concerts count; Past only. */
  wentCount: number | null;
}

export interface VenueCount {
  venueId: string;
  name: string;
  slug: string;
  total: number;
}

/**
 * The shows on this side (Upcoming or Past) that match the search, whole and
 * by filter. No other filter narrows them.
 */
export interface EventListCounts {
  all: number;
  noPrice: number;
  hidden: number;
  byStatus: Partial<Record<EventListStatus, number>>;
  byVenue: VenueCount[];
}

export interface EventListPage {
  rows: EventListRow[];
  total: number;
  counts: EventListCounts;
}

/** The API serves price columns as numeric text; a number is taken too. */
const priceOf = (value: unknown): string | null | undefined =>
  value === null || isText(value)
    ? value
    : isCount(value)
      ? String(value)
      : undefined;

const hiddenReasonOf = (value: unknown): HiddenReason | null | undefined =>
  value === null || value === 'unsure' || value === 'admin' ? value : undefined;

const rowFrom = (value: unknown): EventListRow | null => {
  if (
    !isRecord(value) ||
    !isText(value['id']) ||
    !isText(value['title']) ||
    !isText(value['date']) ||
    !isTextOrNull(value['venueName']) ||
    !isTextOrNull(value['venueSlug']) ||
    !isEventListStatus(value['status']) ||
    typeof value['hidden'] !== 'boolean'
  ) {
    return null;
  }
  const hiddenReason = hiddenReasonOf(value['hiddenReason']);
  const priceMin = priceOf(value['priceMin']);
  const priceMax = priceOf(value['priceMax']);
  if (
    hiddenReason === undefined ||
    priceMin === undefined ||
    priceMax === undefined
  ) {
    return null;
  }
  return {
    id: value['id'],
    title: value['title'],
    date: value['date'],
    venueName: value['venueName'],
    venueSlug: value['venueSlug'],
    status: value['status'],
    hidden: value['hidden'],
    hiddenReason,
    priceMin,
    priceMax,
    watchingCount: isCount(value['watchingCount']) ? value['watchingCount'] : 0,
    wentCount: isCount(value['wentCount']) ? value['wentCount'] : null,
  };
};

const venueCountFrom = (value: unknown): VenueCount | null =>
  isRecord(value) &&
  isText(value['venueId']) &&
  isText(value['name']) &&
  isText(value['slug']) &&
  isCount(value['total'])
    ? {
        venueId: value['venueId'],
        name: value['name'],
        slug: value['slug'],
        total: value['total'],
      }
    : null;

export const countsFrom = (value: unknown): EventListCounts | null => {
  if (
    !isRecord(value) ||
    !isCount(value['all']) ||
    !isCount(value['noPrice']) ||
    !isCount(value['hidden']) ||
    !isRecord(value['byStatus']) ||
    !Array.isArray(value['byVenue'])
  ) {
    return null;
  }
  const byStatus: Partial<Record<EventListStatus, number>> = {};
  for (const [key, total] of Object.entries(value['byStatus'])) {
    if (isEventListStatus(key) && isCount(total)) byStatus[key] = total;
  }
  const byVenue = value['byVenue'].map(venueCountFrom);
  if (byVenue.some((row) => row === null)) return null;
  return {
    all: value['all'],
    noPrice: value['noPrice'],
    hidden: value['hidden'],
    byStatus,
    byVenue: byVenue.flatMap((row) => (row === null ? [] : [row])),
  };
};

export const eventsListApi = (getToken: GetToken) => ({
  list: async (
    filters: EventFilters,
    offset: number,
    limit: number,
  ): Promise<EventListPage> => {
    const data = await call(
      getToken,
      `/v1/admin/events/list?${apiParams(filters, offset, limit).toString()}`,
    );
    if (
      !isRecord(data) ||
      !Array.isArray(data['rows']) ||
      !isCount(data['total'])
    ) {
      throw new Error('events');
    }
    const rows = data['rows'].map(rowFrom);
    const counts = countsFrom(data['counts']);
    if (rows.some((row) => row === null) || counts === null) {
      throw new Error('events');
    }
    return {
      rows: rows.flatMap((row) => (row === null ? [] : [row])),
      total: data['total'],
      counts,
    };
  },
});

export type EventsListApi = ReturnType<typeof eventsListApi>;
