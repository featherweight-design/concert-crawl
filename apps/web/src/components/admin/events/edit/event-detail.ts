/**
 * Event edit's read of `GET /v1/admin/events/:id`, narrowed with type guards
 * so a shape drift fails into Couldn't load rather than into a blank field.
 */
import { z } from 'zod';
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
  /** The venue the Venue picker starts on; `null` when the show has none. */
  venueId: string | null;
  venueName: string | null;
  venueSlug: string | null;
  status: EventListStatus;
  hidden: boolean;
  hiddenReason: HiddenReason | null;
  watchingCount: number;
  /** Fans who marked "I went"; `null` when the API sends none. */
  wentCount: number | null;
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
  /** When the crawl stopped finding it (ISO); null while it's listed. */
  delistedAt: string | null;
  /** The show's own page, else its calendar; `null` when neither is safe. */
  venueUrl: string | null;
  /** The kicker fans see above the title; `null` for none. */
  tourName: string | null;
  /** WHY IT'S SOLD OUT (B+ addendum 7 §6); `null` unless it is sold out. */
  soldOutRecord: SoldOutRecord | null;
  /** The bill in display order: headliners, then supports. */
  lineup: LineupItem[];
  /** Added by hand, so the ⋯ offers Delete… (4b#10). */
  manual: boolean;
}

/**
 * One act as `GET /v1/admin/events/:id` sends it (`readLineup`). `unsure` is
 * an artist Artists calls Unsure; a name with no artist has `artistId` null.
 */
const lineupItemSchema = z.object({
  name: z.string(),
  role: z.enum(['headliner', 'support']),
  position: z.number(),
  artistId: z.string().nullable(),
  slug: z.string().nullable(),
  unsure: z.boolean(),
});
export type LineupItem = z.infer<typeof lineupItemSchema>;

/**
 * Saved through the Show card, so a drift fails the editor rather than
 * reading as an empty bill (a lineup save sends back every name it shows,
 * and would erase the rest).
 */
const lineupSchema = z.array(lineupItemSchema);

export type EvidenceMethod =
  'saw_listing' | 'venue_site' | 'bought_myself' | 'other';

/** The order the form lists them in (`06/sold-out-mark-d`). */
export const EVIDENCE_METHODS: readonly EvidenceMethod[] = [
  'saw_listing',
  'venue_site',
  'bought_myself',
  'other',
];

export const isEvidenceMethod = (value: unknown): value is EvidenceMethod =>
  EVIDENCE_METHODS.some((method) => method === value);

type AvatarColor = 'signal' | 'accent' | 'success' | 'warning';

const isAvatarColorOrNull = (value: unknown): value is AvatarColor | null =>
  value === null ||
  value === 'signal' ||
  value === 'accent' ||
  value === 'success' ||
  value === 'warning';

/** The active promoted sold-out report, as the admin event GET sends it. */
export interface SoldOutRecord {
  reporter: {
    handle: string | null;
    avatarColor: AvatarColor | null;
    avatarSecondColor: AvatarColor | null;
    kind: 'fan' | 'admin';
  };
  evidenceMethod: EvidenceMethod;
  evidenceUrl: string | null;
  note: string | null;
  /** ISO timestamps. */
  reportedAt: string;
  madeLiveAt: string;
  confirmsCount: number;
}

/**
 * An edit-only extra, like `mySubmission`: anything but a well-formed record
 * reads as none, so a drift costs the Status card its record, never the page.
 */
export const soldOutRecordOf = (value: unknown): SoldOutRecord | null => {
  if (!isRecord(value)) return null;
  const reporter = value['reporter'];
  if (
    !isRecord(reporter) ||
    !isTextOrNull(reporter['handle']) ||
    !isAvatarColorOrNull(reporter['avatarColor']) ||
    !isAvatarColorOrNull(reporter['avatarSecondColor'])
  ) {
    return null;
  }
  const kind = reporter['kind'];
  if (kind !== 'fan' && kind !== 'admin') return null;
  if (
    !isEvidenceMethod(value['evidenceMethod']) ||
    !isTextOrNull(value['evidenceUrl']) ||
    !isTextOrNull(value['note']) ||
    !isText(value['reportedAt']) ||
    !isText(value['madeLiveAt']) ||
    !isCount(value['confirmsCount'])
  ) {
    return null;
  }
  return {
    reporter: {
      handle: reporter['handle'],
      avatarColor: reporter['avatarColor'],
      avatarSecondColor: reporter['avatarSecondColor'],
      kind,
    },
    evidenceMethod: value['evidenceMethod'],
    evidenceUrl: value['evidenceUrl'],
    note: value['note'],
    reportedAt: value['reportedAt'],
    madeLiveAt: value['madeLiveAt'],
    confirmsCount: value['confirmsCount'],
  };
};

export interface MySubmission {
  id: string;
  priceMin: string;
  priceMax: string | null;
  /**
   * `pending`, `corroborated` or `disputed`. The admin edit route takes only
   * the first two; a price under an open Price check is not editable here.
   */
  status: string;
}

/** A price as numeric text; the API may send a number. */
const priceText = (value: unknown): string | null | undefined => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return undefined;
};

/** `undefined` when the payload holds something else. */
/**
 * An edit-only extra: anything but a well-formed submission reads as none, so
 * a drift here costs Edit price its sheet, never the whole editor.
 */
const mySubmissionOf = (value: unknown): MySubmission | null => {
  if (!isRecord(value) || !isText(value['id']) || !isText(value['status'])) {
    return null;
  }
  const priceMin = priceText(value['priceMin']);
  const priceMax = priceText(value['priceMax']);
  if (priceMin === undefined || priceMin === null || priceMax === undefined) {
    return null;
  }
  return { id: value['id'], priceMin, priceMax, status: value['status'] };
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
  // Saved through the Show card, so a drift fails rather than reading as none
  // (a save would then clear it).
  const tourName = value['tourName'];
  if (!isTextOrNull(tourName)) return null;
  // Saved through the Venue picker, so a drift fails rather than reading as
  // none. Absent reads as none, which leaves the venue read only.
  const venueId = value['venueId'] ?? null;
  if (!isTextOrNull(venueId)) return null;
  const lineup = lineupSchema.safeParse(value['lineup']);
  if (!lineup.success) return null;
  const priceMin = priceText(value['ticketPriceMin']);
  const priceMax = priceText(value['ticketPriceMax']);
  if (priceMin === undefined || priceMax === undefined) return null;
  // The Price card's extras read leniently: a missing or odd value draws as
  // none rather than failing the whole editor.
  const count = value['submittedPriceCount'];
  const retrieved = value['priceRetrievedAt'];
  const ticketUrl = value['ticketUrl'];
  return {
    id: value['id'],
    title: value['title'],
    artist: value['artist'],
    date: value['date'],
    doorsTime: value['doorsTime'],
    showTime: value['showTime'],
    venueId,
    venueName: value['venueName'],
    venueSlug: value['venueSlug'],
    status: value['listStatus'],
    hidden: value['hiddenFromConsumer'],
    hiddenReason: value['hiddenReason'],
    watchingCount: value['watchingCount'],
    wentCount: isCount(value['wentCount']) ? value['wentCount'] : null,
    isSoldOut: value['isSoldOut'],
    priceMin,
    priceMax,
    submittedPriceCount: isCount(count) ? count : 0,
    priceRetrievedAt: isText(retrieved) ? retrieved : null,
    ticketUrl: isText(ticketUrl) ? ticketUrl : null,
    mySubmission: mySubmissionOf(value['mySubmission']),
    extractionStrategy: value['extractionStrategy'],
    firstSeenAt: value['createdAt'],
    lastSeenAt: value['lastSeenAt'],
    delistedAt: isText(value['delistedAt']) ? value['delistedAt'] : null,
    venueUrl: resolveVenueCheckUrl(eventUrl, sourceUrl),
    tourName,
    soldOutRecord: soldOutRecordOf(value['soldOutRecord']),
    lineup: lineup.data,
    // Absent on an API older than this web build: not deletable.
    manual: value['manual'] === true,
  };
};

/**
 * A past show takes corrections only (B+ addendum 6 item 36): title, times
 * and a date still in the past, and Hide. Past means dated before today in
 * Mountain Time (`today` is `YYYY-MM-DD`), as the list's Past side counts it.
 */
export const isPast = (detail: EventDetail, today: string): boolean =>
  detail.date < today;

/**
 * A postponed show whose date passed (`36/postponed-passed-d`): never played,
 * it keeps the upcoming editor so it can still get its new date.
 */
export const isPostponedPassed = (
  detail: EventDetail,
  today: string,
): boolean => isPast(detail, today) && detail.status === 'postponed';

/** The day before a `YYYY-MM-DD`: the latest date a played show may move to. */
export const dayBefore = (date: string): string => {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
};

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
