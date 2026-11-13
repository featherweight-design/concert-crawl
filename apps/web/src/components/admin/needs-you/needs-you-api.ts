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

/** One crawl run a venue item lists (newest first). `status` is the run's own word. */
export interface RunLine {
  at: string;
  status: string;
  errorMessage: string | null;
  /** Events the run's extractor found, when it recorded a count. */
  eventsFound: number | null;
}

/** The show a moved one now looks like. */
export interface MoveTo {
  eventId: string;
  title: string;
  venueName: string | null;
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
  /** The show's start (`HH:MM:SS`, venue-local) on the kinds that have one. */
  showTime: string | null;
  watchers: number;
  answers: NeedsYouAnswer[];
  evidence: EvidenceLine[];
  /** A venue item's likely cause, when the API names one. */
  cause: string | null;
  /** An artist item's open reports. */
  reportCount: number | null;
  /** A dropped show's last sighting, an ISO instant. */
  lastSeenAt: string | null;
  /** A moved show's new listing. */
  moveTo: MoveTo | null;
  /** A venue item's recent runs, as the API sent them (empty on other kinds). */
  lastRuns: RunLine[];
  /** A venue item's published state; null when the API did not say. */
  venueLive: boolean | null;
  /** When crawling was paused (an ISO instant), or null. */
  pausedAt: string | null;
  /** A venue item's upcoming shows, or null when the API did not say. */
  showCount: number | null;
  /** OK runs in a row before the failure or the block, or null. */
  okStreakBefore: number | null;
  /** A blocked venue's pages fetched by the latest run, or null. */
  pagesThisRun: number | null;
  /** A blocked venue's recorded robots.txt result (yes, no, unchecked), or null. */
  robots: string | null;
  /** A dropped show's venue: its other upcoming shows the last run still saw. */
  otherShowsCrawledFine: number | null;
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

/** A venue item's runs: the ones this build can draw, or none. */
const runsFrom = (value: unknown): RunLine[] =>
  Array.isArray(value)
    ? value.flatMap((run): RunLine[] =>
        isRecord(run) &&
        isText(run['at']) &&
        isText(run['status']) &&
        isTextOrNull(run['errorMessage'])
          ? [
              {
                at: run['at'],
                status: run['status'],
                errorMessage: run['errorMessage'],
                eventsFound: isCount(run['eventsFound'])
                  ? run['eventsFound']
                  : null,
              },
            ]
          : [],
      )
    : [];

const moveToFrom = (value: unknown): MoveTo | null =>
  isRecord(value) &&
  isText(value['eventId']) &&
  isText(value['title']) &&
  isTextOrNull(value['venueName'])
    ? {
        eventId: value['eventId'],
        title: value['title'],
        venueName: value['venueName'],
      }
    : null;

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
    showTime: isText(value['showTime']) ? value['showTime'] : null,
    watchers: value['watchers'],
    answers: value['answers'],
    evidence: evidenceFrom(value['evidence']),
    cause: isText(value['cause']) ? value['cause'] : null,
    reportCount: isCount(value['reportCount']) ? value['reportCount'] : null,
    lastSeenAt: isText(value['lastSeenAt']) ? value['lastSeenAt'] : null,
    moveTo: moveToFrom(value['moveTo']),
    lastRuns: runsFrom(value['lastRuns']),
    venueLive: isBoolean(value['venueLive']) ? value['venueLive'] : null,
    pausedAt: isText(value['pausedAt']) ? value['pausedAt'] : null,
    showCount: isCount(value['showCount']) ? value['showCount'] : null,
    okStreakBefore: isCount(value['okStreakBefore'])
      ? value['okStreakBefore']
      : null,
    pagesThisRun: isCount(value['pagesThisRun']) ? value['pagesThisRun'] : null,
    robots: isText(value['robots']) ? value['robots'] : null,
    otherShowsCrawledFine: isCount(value['otherShowsCrawledFine'])
      ? value['otherShowsCrawledFine']
      : null,
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
  /** One answer. `auditId` is what Undo points at; null when it can't be undone. */
  answer: async (key: string, slug: string): Promise<AnswerResult> => {
    const data = await call(
      getToken,
      `/v1/admin/needs-you/items/${encodeURIComponent(key)}/answer`,
      { method: 'POST', body: { answer: slug } },
    );
    if (!isRecord(data)) throw new Error('needs-you answer');
    const auditId = isText(data['auditId']) ? data['auditId'] : null;
    return { auditId, undoable: data['undoable'] === true && auditId !== null };
  },
  undo: async (auditId: string): Promise<void> => {
    await call(
      getToken,
      `/v1/admin/needs-you/answers/${encodeURIComponent(auditId)}/undo`,
      { method: 'POST' },
    );
  },
  /** Back in the queue at `until` (an ISO instant with an offset). */
  snooze: async (key: string, until: string): Promise<void> => {
    await call(
      getToken,
      `/v1/admin/needs-you/items/${encodeURIComponent(key)}/snooze`,
      { method: 'POST', body: { until } },
    );
  },
  /** Stops this kind of warning for the item's venue. */
  notUseful: async (key: string, reason: string): Promise<void> => {
    const trimmed = reason.trim();
    await call(
      getToken,
      `/v1/admin/needs-you/items/${encodeURIComponent(key)}/snooze`,
      {
        method: 'POST',
        body: trimmed
          ? { notUseful: true, reason: trimmed }
          : { notUseful: true },
      },
    );
  },
});

export interface AnswerResult {
  auditId: string | null;
  undoable: boolean;
}

export type NeedsYouApi = ReturnType<typeof needsYouApi>;
