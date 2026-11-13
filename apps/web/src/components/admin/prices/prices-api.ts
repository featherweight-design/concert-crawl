/**
 * The Prices page's calls (`/v1/admin/prices/**`, the settings toggle, the
 * sold-out action), from the browser with the Clerk token, through the invite
 * codes admin's `call`. Payloads are narrowed with type guards so a shape drift
 * fails into Couldn't load rather than into a blank row.
 */
import {
  call,
  isCount,
  isRecord,
  isText,
  isTextOrNull,
  type GetToken,
} from '../invite-codes/codes-api';

/** One show on the Missing a price tab. */
export interface MissingRow {
  eventId: string;
  title: string;
  venueName: string | null;
  /** `YYYY-MM-DD`, Mountain Time. */
  date: string;
  ticketUrl: string | null;
  watching: number;
}

export interface TabCounts {
  missing: number;
  submitted: number;
  checksOpen: number;
  checksResolved: number;
  peopleSubmitting: number;
}

export interface NewPrice {
  eventId: string;
  priceMin: string;
  priceMax?: string;
  vendor: string;
  howFound: 'saw_listing';
}

const missingRowFrom = (value: unknown): MissingRow | null => {
  if (
    !isRecord(value) ||
    !isText(value['eventId']) ||
    !isText(value['eventTitle']) ||
    !isText(value['date']) ||
    !isTextOrNull(value['venueName']) ||
    !isTextOrNull(value['ticketUrl'])
  ) {
    return null;
  }
  const watching = isCount(value['watching']) ? value['watching'] : 0;
  return {
    eventId: value['eventId'],
    title: value['eventTitle'],
    venueName: value['venueName'],
    date: value['date'],
    ticketUrl: value['ticketUrl'],
    watching,
  };
};

const tabCountsFrom = (value: unknown): TabCounts | null => {
  if (!isRecord(value)) return null;
  const { missing, submitted, checksOpen, checksResolved, peopleSubmitting } =
    value;
  if (
    !isCount(missing) ||
    !isCount(submitted) ||
    !isCount(checksOpen) ||
    !isCount(checksResolved) ||
    !isCount(peopleSubmitting)
  ) {
    return null;
  }
  return { missing, submitted, checksOpen, checksResolved, peopleSubmitting };
};

export const pricesApi = (getToken: GetToken) => ({
  tabs: async (): Promise<TabCounts> => {
    const counts = tabCountsFrom(await call(getToken, '/v1/admin/prices/tabs'));
    if (!counts) throw new Error('tabs');
    return counts;
  },

  /** One page of shows without a price, soonest and most Watched first. */
  missing: async (
    offset: number,
    limit: number,
  ): Promise<{ rows: MissingRow[]; total: number }> => {
    const data = await call(
      getToken,
      `/v1/admin/prices/events?count=true&limit=${limit}&offset=${offset}`,
    );
    if (!isRecord(data) || !Array.isArray(data['rows'])) {
      throw new Error('missing');
    }
    const rows = data['rows'].map(missingRowFrom);
    if (rows.some((row) => row === null) || !isCount(data['total'])) {
      throw new Error('missing');
    }
    return {
      rows: rows.flatMap((row) => (row === null ? [] : [row])),
      total: data['total'],
    };
  },

  /** The show after `after` in the same order, or null at the end. */
  missingNext: async (after: string): Promise<MissingRow | null> => {
    const data = await call(
      getToken,
      `/v1/admin/prices/missing/next?after=${encodeURIComponent(after)}`,
    );
    if (data === null) return null;
    const row = missingRowFrom(data);
    if (!row) throw new Error('next');
    return row;
  },

  addPrice: async (price: NewPrice): Promise<void> => {
    await call(getToken, '/v1/admin/prices/submissions', {
      method: 'POST',
      body: price,
    });
  },

  markSoldOut: async (eventId: string, evidenceUrl: string | null) => {
    await call(getToken, `/v1/admin/events/${eventId}/sold-out`, {
      method: 'POST',
      body: {
        evidenceMethod: 'saw_listing',
        ...(evidenceUrl === null ? {} : { evidenceUrl }),
      },
    });
  },

  approveMyself: async (): Promise<boolean> => {
    const data = await call(getToken, '/v1/admin/settings');
    if (!isRecord(data) || typeof data['approvePricesMyself'] !== 'boolean') {
      throw new Error('settings');
    }
    return data['approvePricesMyself'];
  },

  setApproveMyself: async (on: boolean): Promise<void> => {
    await call(getToken, '/v1/admin/settings', {
      method: 'PATCH',
      body: { approvePricesMyself: on },
    });
  },
});

export type PricesApi = ReturnType<typeof pricesApi>;
