/**
 * The Price checks tab's calls: the open checks (`GET /v1/admin/contests/prices`),
 * the resolved ones (`.../prices/resolved`) and Use / Keep (`.../:id/resolve`).
 * Same contract as the Prices page's other calls (Clerk token through `call`,
 * payloads narrowed with guards so a shape drift fails into Couldn't load).
 */
import type { AvatarColor } from '@concert-crawl/types';
import {
  avatarColorOrNull,
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
  ticketUrl: string | null;
  /** Fans Watching the show. */
  watching: number;
  listed: CheckSide;
  check: CheckSide;
}

/** One side of a resolved check, as the resolve recorded it. */
export interface ResolvedSide {
  priceMin: string | null;
  priceMax: string | null;
  /** Who filed it (their handle as it is now). */
  handle: string | null;
  /** Fans behind it, the filer included. */
  confirmed: number | null;
  note: string | null;
}

export type ToldRole = 'parent' | 'challenger';

export interface ResolvedCheck {
  id: string;
  /** Null when the audit entry named no event. */
  eventId: string | null;
  title: string | null;
  venueName: string | null;
  date: string | null;
  ticketUrl: string | null;
  answer: 'used' | 'kept';
  price: string | null;
  decidedBy: string | null;
  decidedByAvatar: {
    color: AvatarColor | null;
    secondColor: AvatarColor | null;
  } | null;
  /** ISO. */
  decidedAt: string;
  /** The admin's reason for the answer. */
  note: string | null;
  /** The listed price the check was against. */
  parent: ResolvedSide | null;
  /** The fan's Price check. */
  challenger: ResolvedSide | null;
  /** Whose notifications the resolve wrote; null when unknown. */
  told: ToldRole[] | null;
  /** False: confirms, notes and Told are a best-effort read of today's rows. */
  snapshot: boolean;
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
    !isText(value['eventDate']) ||
    !isTextOrNull(value['ticketUrl']) ||
    !isCount(value['watching'])
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
    ticketUrl: value['ticketUrl'],
    watching: value['watching'],
    listed,
    check,
  };
};

const isCountOrNull = (value: unknown): value is number | null =>
  value === null || isCount(value);

const isToldRole = (value: unknown): value is ToldRole =>
  value === 'parent' || value === 'challenger';

/** A side, null when absent; undefined when present but malformed (drift). */
const resolvedSideFrom = (value: unknown): ResolvedSide | null | undefined => {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !isTextOrNull(value['priceMin']) ||
    !isTextOrNull(value['priceMax']) ||
    !isTextOrNull(value['submittedBy']) ||
    !isCountOrNull(value['corroborationCount']) ||
    !isTextOrNull(value['note'])
  ) {
    return undefined;
  }
  return {
    priceMin: value['priceMin'],
    priceMax: value['priceMax'],
    handle: value['submittedBy'],
    confirmed: value['corroborationCount'],
    note: value['note'],
  };
};

const toldFrom = (value: unknown): ToldRole[] | null | undefined => {
  if (value === null) return null;
  if (!Array.isArray(value)) return undefined;
  const roles = value.filter(isToldRole);
  return roles.length === value.length ? roles : undefined;
};

const avatarFrom = (
  value: unknown,
): ResolvedCheck['decidedByAvatar'] | undefined => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  // A colour this build doesn't know draws the house pair, not a failed row.
  return {
    color: avatarColorOrNull(value['color']),
    secondColor: avatarColorOrNull(value['secondColor']),
  };
};

const resolvedFrom = (value: unknown): ResolvedCheck | null => {
  if (
    !isRecord(value) ||
    !isText(value['id']) ||
    !isTextOrNull(value['eventId']) ||
    !isTextOrNull(value['ticketUrl']) ||
    !isTextOrNull(value['note']) ||
    typeof value['snapshot'] !== 'boolean' ||
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
  const parent = resolvedSideFrom(value['parent']);
  const challenger = resolvedSideFrom(value['challenger']);
  const told = toldFrom(value['told']);
  const decidedByAvatar = avatarFrom(value['decidedByAvatar']);
  if (
    parent === undefined ||
    challenger === undefined ||
    told === undefined ||
    decidedByAvatar === undefined
  ) {
    return null;
  }
  return {
    id: value['id'],
    eventId: value['eventId'],
    title: value['eventTitle'],
    venueName: value['venueName'],
    date: value['eventDate'],
    ticketUrl: value['ticketUrl'],
    answer: value['answer'],
    price: value['price'],
    decidedBy: value['decidedBy'],
    decidedByAvatar,
    decidedAt: value['decidedAt'],
    note: value['note'],
    parent,
    challenger,
    told,
    snapshot: value['snapshot'],
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
