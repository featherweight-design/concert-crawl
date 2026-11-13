/**
 * The Submitted prices tab's calls: the list, the chip counts and Reject. Same
 * contract as the Prices page's other calls (Clerk token through `call`,
 * payloads narrowed with guards so a shape drift fails into Couldn't load).
 */
import {
  call,
  isCount,
  isRecord,
  isText,
  isTextOrNull,
  type GetToken,
} from '../invite-codes/codes-api';
import {
  isSubmissionState,
  type RejectionReason,
  type StateFilter,
  type SubmissionState,
} from './submitted-rules';

export interface SubmittedRow {
  id: string;
  eventId: string;
  title: string;
  venueName: string | null;
  /** `YYYY-MM-DD`, Mountain Time. */
  date: string | null;
  priceMin: string;
  priceMax: string | null;
  /** The fan's @handle without the "@"; null when they have none. */
  handle: string | null;
  backedBy: number;
  state: SubmissionState;
  ticketUrl: string | null;
}

export interface StateCounts {
  all: number;
  waiting: number;
  published: number;
  priceCheck: number;
}

const rowFrom = (value: unknown): SubmittedRow | null => {
  if (
    !isRecord(value) ||
    !isText(value['id']) ||
    !isText(value['eventId']) ||
    !isText(value['priceMin']) ||
    !isTextOrNull(value['priceMax']) ||
    !isTextOrNull(value['handle']) ||
    !isTextOrNull(value['eventTitle']) ||
    !isTextOrNull(value['eventDate']) ||
    !isTextOrNull(value['venueName']) ||
    !isTextOrNull(value['ticketUrl']) ||
    !isCount(value['backedBy']) ||
    !isSubmissionState(value['state'])
  ) {
    return null;
  }
  return {
    id: value['id'],
    eventId: value['eventId'],
    title: value['eventTitle'] ?? '',
    venueName: value['venueName'],
    date: value['eventDate'],
    priceMin: value['priceMin'],
    priceMax: value['priceMax'],
    handle: value['handle'],
    backedBy: value['backedBy'],
    state: value['state'],
    ticketUrl: value['ticketUrl'],
  };
};

const query = (filter: StateFilter, search: string): string =>
  `state=${filter}${search === '' ? '' : `&search=${encodeURIComponent(search)}`}`;

export const submittedApi = (getToken: GetToken) => ({
  list: async (
    filter: StateFilter,
    search: string,
    offset: number,
    limit: number,
  ): Promise<{ rows: SubmittedRow[]; total: number }> => {
    const data = await call(
      getToken,
      `/v1/admin/prices/submissions?count=true&${query(filter, search)}&limit=${limit}&offset=${offset}`,
    );
    if (!isRecord(data) || !Array.isArray(data['rows'])) {
      throw new Error('submissions');
    }
    const rows = data['rows'].map(rowFrom);
    if (rows.some((row) => row === null) || !isCount(data['total'])) {
      throw new Error('submissions');
    }
    return {
      rows: rows.flatMap((row) => (row === null ? [] : [row])),
      total: data['total'],
    };
  },

  counts: async (search: string): Promise<StateCounts> => {
    const data = await call(
      getToken,
      `/v1/admin/prices/submissions/state-counts${search === '' ? '' : `?search=${encodeURIComponent(search)}`}`,
    );
    if (
      !isRecord(data) ||
      !isCount(data['all']) ||
      !isCount(data['waiting']) ||
      !isCount(data['published']) ||
      !isCount(data['priceCheck'])
    ) {
      throw new Error('counts');
    }
    return {
      all: data['all'],
      waiting: data['waiting'],
      published: data['published'],
      priceCheck: data['priceCheck'],
    };
  },

  reject: async (
    id: string,
    reason: RejectionReason,
    note: string,
  ): Promise<void> => {
    await call(getToken, `/v1/admin/prices/submissions/${id}/reject`, {
      method: 'POST',
      body: { reason, ...(note === '' ? {} : { note }) },
    });
  },
});

export type SubmittedApi = ReturnType<typeof submittedApi>;
