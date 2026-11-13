/**
 * The Price checks tab's calls: the open checks (`GET /v1/admin/contests/prices`),
 * the resolved ones (`.../prices/resolved`) and Use / Keep (`.../:id/resolve`).
 * Same contract as the Prices page's other calls (Clerk token through `call`,
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

/** One side of a check: a price and the fan who filed it. */
export interface CheckSide {
  id: string;
  priceMin: string;
  priceMax: string | null;
  handle: string | null;
  /** When the fan filed it (ISO). */
  observedAt: string;
}

export interface OpenCheck {
  /** The listed price's id: what resolve takes as its path id. */
  contestId: string;
  eventId: string;
  title: string;
  venueName: string;
  /** `YYYY-MM-DD`, Mountain Time. */
  date: string;
  listed: CheckSide;
  check: CheckSide;
}

export interface ResolvedCheck {
  id: string;
  title: string | null;
  venueName: string | null;
  date: string | null;
  answer: 'used' | 'kept';
  price: string | null;
  decidedBy: string | null;
  /** ISO. */
  decidedAt: string;
}

const sideFrom = (value: unknown): CheckSide | null => {
  if (
    !isRecord(value) ||
    !isText(value['id']) ||
    !isText(value['priceMin']) ||
    !isTextOrNull(value['priceMax']) ||
    !isText(value['observedAt']) ||
    !isRecord(value['submitter']) ||
    !isTextOrNull(value['submitter']['handle'])
  ) {
    return null;
  }
  return {
    id: value['id'],
    priceMin: value['priceMin'],
    priceMax: value['priceMax'],
    handle: value['submitter']['handle'],
    observedAt: value['observedAt'],
  };
};

const openFrom = (value: unknown): OpenCheck | null => {
  if (
    !isRecord(value) ||
    !isText(value['contestId']) ||
    !isText(value['eventId']) ||
    !isText(value['eventTitle']) ||
    !isText(value['venueName']) ||
    !isText(value['eventDate'])
  ) {
    return null;
  }
  const listed = sideFrom(value['parent']);
  const check = sideFrom(value['counter']);
  if (!listed || !check) return null;
  return {
    contestId: value['contestId'],
    eventId: value['eventId'],
    title: value['eventTitle'],
    venueName: value['venueName'],
    date: value['eventDate'],
    listed,
    check,
  };
};

const resolvedFrom = (value: unknown): ResolvedCheck | null => {
  if (
    !isRecord(value) ||
    !isText(value['id']) ||
    !isTextOrNull(value['eventTitle']) ||
    !isTextOrNull(value['venueName']) ||
    !isTextOrNull(value['eventDate']) ||
    !isTextOrNull(value['price']) ||
    !isTextOrNull(value['decidedBy']) ||
    !isText(value['decidedAt']) ||
    (value['answer'] !== 'used' && value['answer'] !== 'kept')
  ) {
    return null;
  }
  return {
    id: value['id'],
    title: value['eventTitle'],
    venueName: value['venueName'],
    date: value['eventDate'],
    answer: value['answer'],
    price: value['price'],
    decidedBy: value['decidedBy'],
    decidedAt: value['decidedAt'],
  };
};

const page = <T>(
  data: unknown,
  parse: (value: unknown) => T | null,
): { items: T[]; total: number } => {
  if (
    !isRecord(data) ||
    !Array.isArray(data['items']) ||
    !isCount(data['total'])
  ) {
    throw new Error('checks');
  }
  const items = data['items'].map(parse);
  if (items.some((item) => item === null)) throw new Error('checks');
  return {
    items: items.flatMap((item) => (item === null ? [] : [item])),
    total: data['total'],
  };
};

export const checksApi = (getToken: GetToken) => ({
  open: async (offset: number, limit: number) =>
    page(
      await call(
        getToken,
        `/v1/admin/contests/prices?limit=${limit}&offset=${offset}`,
      ),
      openFrom,
    ),

  resolved: async (offset: number, limit: number) =>
    page(
      await call(
        getToken,
        `/v1/admin/contests/prices/resolved?limit=${limit}&offset=${offset}`,
      ),
      resolvedFrom,
    ),

  /** Use the fan's price (the check wins) or Keep the listed one. */
  resolve: async (
    check: OpenCheck,
    answer: 'use' | 'keep',
    reason: string,
  ): Promise<void> => {
    await call(
      getToken,
      `/v1/admin/contests/prices/${check.contestId}/resolve`,
      {
        method: 'POST',
        body: {
          resolution: answer === 'use' ? 'challenger_wins' : 'parent_wins',
          reason,
          challengerId: check.check.id,
        },
      },
    );
  },
});

export type ChecksApi = ReturnType<typeof checksApi>;
