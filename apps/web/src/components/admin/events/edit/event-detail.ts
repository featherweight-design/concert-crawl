/**
 * Event edit's read of `GET /v1/admin/events/:id`, narrowed with type guards
 * so a shape drift fails into Couldn't load rather than into a blank field.
 */
import { resolveVenueCheckUrl } from '@/lib/admin/missing';
import {
  isCount,
  isRecord,
  isText,
  isTextOrNull,
} from '../../invite-codes/codes-api';
import type { HiddenReason } from '../list/events-api';
import { isEventListStatus, type EventListStatus } from '../list/events-rules';

export interface EventDetail {
  id: string;
  title: string;
  /** The headliner's short name: the breadcrumb and dialog titles. */
  artist: string;
  /** `YYYY-MM-DD`, Mountain Time. */
  date: string;
  /** `HH:MM:SS`, venue-local; `null` when the venue lists none. */
  doorsTime: string | null;
  showTime: string | null;
  venueName: string | null;
  venueSlug: string | null;
  status: EventListStatus;
  hidden: boolean;
  hiddenReason: HiddenReason | null;
  watchingCount: number;
  /**
   * The sold-out flag, apart from `status`: a postponed show can be sold out
   * too, and Tickets available must clear it.
   */
  isSoldOut: boolean;
  /** The listed price, numeric text; `null` when the show has none. */
  priceMin: string | null;
  priceMax: string | null;
  /** Submitted prices that stand (no counters, nothing stale). */
  submittedPriceCount: number;
  /** When the price pipeline last checked the ticket page (ISO). */
  priceRetrievedAt: string | null;
  ticketUrl: string | null;
  /** The admin's own live price on the show, which Edit price opens. */
  mySubmission: MySubmission | null;
  /** `structured_data`, `llm` or `manual`; `null` when unknown. */
  extractionStrategy: string | null;
  /** ISO timestamps. */
  firstSeenAt: string;
  lastSeenAt: string | null;
  /** The show's own page, else its calendar; `null` when neither is safe. */
  venueUrl: string | null;
}

export interface MySubmission {
  id: string;
  priceMin: string;
  priceMax: string | null;
}

/** A price as numeric text; the API may send a number. */
const priceText = (value: unknown): string | null | undefined => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

/** `undefined` when the payload holds something else. */
const mySubmissionOf = (value: unknown): MySubmission | null | undefined => {
  if (value === null || value === undefined) return null;
  if (!isRecord(value) || !isText(value['id'])) return undefined;
  const priceMin = priceText(value['priceMin']);
  const priceMax = priceText(value['priceMax']);
  if (priceMin === undefined || priceMin === null || priceMax === undefined) {
    return undefined;
  }
  return { id: value['id'], priceMin, priceMax };
};

const isHiddenReason = (value: unknown): value is HiddenReason | null =>
  value === null || value === 'unsure' || value === 'admin';

/** The detail, or `null` when the payload is not one. */
export const eventDetailFrom = (value: unknown): EventDetail | null => {
  if (
    !isRecord(value) ||
    !isText(value['id']) ||
    !isText(value['title']) ||
    !isText(value['artist']) ||
    !isText(value['date']) ||
    !isTextOrNull(value['doorsTime']) ||
    !isTextOrNull(value['showTime']) ||
    !isTextOrNull(value['venueName']) ||
    !isTextOrNull(value['venueSlug']) ||
    !isEventListStatus(value['listStatus']) ||
    typeof value['hiddenFromConsumer'] !== 'boolean' ||
    !isHiddenReason(value['hiddenReason']) ||
    !isCount(value['watchingCount']) ||
    typeof value['isSoldOut'] !== 'boolean' ||
    !isCount(value['submittedPriceCount']) ||
    !isTextOrNull(value['priceRetrievedAt']) ||
    !isTextOrNull(value['ticketUrl']) ||
    !isTextOrNull(value['extractionStrategy']) ||
    !isText(value['createdAt']) ||
    !isTextOrNull(value['lastSeenAt'])
  ) {
    return null;
  }
  // `eventUrl` is absent on an API older than this web build: no show page.
  const eventUrl = value['eventUrl'] ?? null;
  const sourceUrl = value['sourceUrl'];
  if (!isTextOrNull(eventUrl) || !isTextOrNull(sourceUrl)) return null;
  const priceMin = priceText(value['ticketPriceMin']);
  const priceMax = priceText(value['ticketPriceMax']);
  const mySubmission = mySubmissionOf(value['mySubmission']);
  if (
    priceMin === undefined ||
    priceMax === undefined ||
    mySubmission === undefined
  ) {
    return null;
  }
  return {
    id: value['id'],
    title: value['title'],
    artist: value['artist'],
    date: value['date'],
    doorsTime: value['doorsTime'],
    showTime: value['showTime'],
    venueName: value['venueName'],
    venueSlug: value['venueSlug'],
    status: value['listStatus'],
    hidden: value['hiddenFromConsumer'],
    hiddenReason: value['hiddenReason'],
    watchingCount: value['watchingCount'],
    isSoldOut: value['isSoldOut'],
    priceMin,
    priceMax,
    submittedPriceCount: value['submittedPriceCount'],
    priceRetrievedAt: value['priceRetrievedAt'],
    ticketUrl: value['ticketUrl'],
    mySubmission,
    extractionStrategy: value['extractionStrategy'],
    firstSeenAt: value['createdAt'],
    lastSeenAt: value['lastSeenAt'],
    venueUrl: resolveVenueCheckUrl(eventUrl, sourceUrl),
  };
};

/**
 * A past show locks every field but Hidden and the lineup (4b#22). Past means
 * dated before today in Mountain Time (`today` is `YYYY-MM-DD`), as the
 * list's Past side counts it.
 */
export const isPast = (detail: EventDetail, today: string): boolean =>
  detail.date < today;

/** "6:00 PM" from a stored `HH:MM:SS` (venue-local, so no zone to convert). */
export const fieldTime = (time: string | null): string | null => {
  const match = /^(\d{2}):(\d{2})/.exec(time ?? '');
  if (!match) return null;
  const hours = Number(match[1]);
  if (hours > 23) return null;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
};

/** "Sat, Nov 14, 2026" on desktop, "Sat, Nov 14" on the phone. */
export const fieldDate = (date: string, withYear: boolean): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(withYear && { year: 'numeric' }),
  }).format(new Date(`${date}T00:00:00Z`));
