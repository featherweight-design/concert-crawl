/**
 * The Needs you queue's calls (`GET /v1/admin/needs-you` and `/count`), from the
 * browser with the Clerk token, through the invite-codes admin's `call`. The
 * payload is checked with type guards and narrowed to the fields the queue
 * draws, so a shape drift fails into Couldn't load rather than into a blank
 * card. The count comes from `/count`: the list's own `count` sits beside
 * `data`, outside the envelope `call` unwraps.
 */
import type { NeedsYouCount, NeedsYouKind } from '@concert-crawl/types';
import {
  call,
  isCount,
  isRecord,
  isText,
  isTextOrNull,
  type GetToken,
} from '../invite-codes/codes-api';

export interface NeedsYouAnswer {
  slug: string;
  label: string;
  notifiesFans: boolean;
  undoable: boolean;
  suggested: boolean;
}

export interface EvidenceLine {
  label: string;
  value: string;
}

/** One card: the fields the queue draws, whatever the item's kind. */
export interface QueueRow {
  key: string;
  kind: NeedsYouKind;
  title: string;
  venueId: string | null;
  venueName: string | null;
  /** The show's date in Mountain Time, `YYYY-MM-DD`, or null. */
  fanDate: string | null;
  watchers: number;
  answers: NeedsYouAnswer[];
  evidence: EvidenceLine[];
  /** A venue item's likely cause, when the API names one. */
  cause: string | null;
  /** An artist item's open reports. */
  reportCount: number | null;
}

// Every kind the API serves. A `Record` so a kind added to the type fails to
// compile here until it is listed.
const KIND_SEEN: Record<NeedsYouKind, true> = {
  'show-dropped': true,
  'show-moved': true,
  'venue-failing': true,
  'venue-blocked': true,
  artist: true,
  'event-low-confidence': true,
  'price-check': true,
  'price-batch': true,
  bug: true,
};

export const isNeedsYouKind = (value: unknown): value is NeedsYouKind =>
  typeof value === 'string' && Object.hasOwn(KIND_SEEN, value);

const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

const isAnswer = (value: unknown): value is NeedsYouAnswer =>
  isRecord(value) &&
  isText(value['slug']) &&
  isText(value['label']) &&
  isBoolean(value['notifiesFans']) &&
  isBoolean(value['undoable']) &&
  isBoolean(value['suggested']);

const isEvidenceLine = (value: unknown): value is EvidenceLine =>
  isRecord(value) && isText(value['label']) && isText(value['value']);

/** A row's evidence: lines this build can draw, or none. */
const evidenceFrom = (value: unknown): EvidenceLine[] =>
  Array.isArray(value) ? value.filter(isEvidenceLine) : [];

const rowFrom = (value: unknown): QueueRow | null => {
  if (
    !isRecord(value) ||
    !isText(value['key']) ||
    !isNeedsYouKind(value['kind']) ||
    !isText(value['title']) ||
    !isTextOrNull(value['venueId']) ||
    !isTextOrNull(value['venueName']) ||
    !isTextOrNull(value['fanDate']) ||
    !isCount(value['watchers']) ||
    !Array.isArray(value['answers']) ||
    !value['answers'].every(isAnswer)
  )
    return null;
  return {
    key: value['key'],
    kind: value['kind'],
    title: value['title'],
    venueId: value['venueId'],
    venueName: value['venueName'],
    fanDate: value['fanDate'],
    watchers: value['watchers'],
    answers: value['answers'],
    evidence: evidenceFrom(value['evidence']),
    cause: isText(value['cause']) ? value['cause'] : null,
    reportCount: isCount(value['reportCount']) ? value['reportCount'] : null,
  };
};

const countFrom = (value: unknown): NeedsYouCount | null => {
  if (
    !isRecord(value) ||
    !isCount(value['decisions']) ||
    !isCount(value['handledToday']) ||
    !isRecord(value['byKind'])
  )
    return null;
  const byKind = value['byKind'];
  const counts: Partial<Record<NeedsYouKind, number>> = {};
  for (const kind of Object.keys(KIND_SEEN)) {
    const total = byKind[kind];
    if (isNeedsYouKind(kind) && isCount(total)) counts[kind] = total;
  }
  const full: NeedsYouCount['byKind'] = {
    'show-dropped': counts['show-dropped'] ?? 0,
    'show-moved': counts['show-moved'] ?? 0,
    'venue-failing': counts['venue-failing'] ?? 0,
    'venue-blocked': counts['venue-blocked'] ?? 0,
    artist: counts['artist'] ?? 0,
    'event-low-confidence': counts['event-low-confidence'] ?? 0,
    'price-check': counts['price-check'] ?? 0,
    'price-batch': counts['price-batch'] ?? 0,
    bug: counts['bug'] ?? 0,
  };
  return {
    decisions: value['decisions'],
    handledToday: value['handledToday'],
    byKind: full,
  };
};

export const needsYouApi = (getToken: GetToken) => ({
  list: async (): Promise<QueueRow[]> => {
    const data = await call(getToken, '/v1/admin/needs-you');
    if (!Array.isArray(data)) throw new Error('needs-you');
    const rows = data.map(rowFrom);
    // One unreadable card must not hide the rest of the queue.
    return rows.filter((row): row is QueueRow => row !== null);
  },
  count: async (): Promise<NeedsYouCount> => {
    const count = countFrom(await call(getToken, '/v1/admin/needs-you/count'));
    if (!count) throw new Error('needs-you count');
    return count;
  },
  /** One answer, by the slug the item offered. */
  answer: async (key: string, slug: string): Promise<void> => {
    await call(
      getToken,
      `/v1/admin/needs-you/items/${encodeURIComponent(key)}/answer`,
      { method: 'POST', body: { answer: slug } },
    );
  },
});

export type NeedsYouApi = ReturnType<typeof needsYouApi>;
