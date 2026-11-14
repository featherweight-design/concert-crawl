/**
 * The Needs you queue's calls (`GET /v1/admin/needs-you` and `/count`), from the
 * browser with the Clerk token, through the invite-codes admin's `call`. The
 * payload is checked with type guards and narrowed to the fields the queue
 * draws, so a shape drift fails into Couldn't load rather than into a blank
 * card. The count comes from `/count`: the list's own `count` sits beside
 * `data`, outside the envelope `call` unwraps.
 */
import type {
  AllClearFacts,
  CrawlPauseRequest,
  CrawlRunReason,
  NeedsYouCount,
  NeedsYouKind,
} from '@concert-crawl/types';
import { RUN_REASONS } from '../venues/overview/overview-data';
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

/** The extra fields an answer carries next to its slug. */
export type AnswerParams = Record<string, string | string[]>;

/** One stored Spotify candidate for an artist match question. */
export interface ArtistCandidate {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  current: boolean;
  exact: boolean;
  playsDenver: boolean;
}

/** What an artist item adds to the card's fields. */
export interface ArtistFacts {
  nextShowVenue: string | null;
  spotifyArtistId: string | null;
  photoUrl: string | null;
  reportReasons: string[];
  candidates: ArtistCandidate[];
}

/** What a low-confidence event item adds. */
export interface EventFacts {
  eventId: string | null;
  artist: string | null;
  description: string | null;
  confidence: number | null;
  autoApproveBar: number | null;
  priceMin: string | null;
  priceMax: string | null;
}

/** What a price check item adds (prices are the API's numeric strings). */
export interface PriceFacts {
  listed: string | null;
  listedMax: string | null;
  checked: string | null;
  checkedMax: string | null;
  tier: string | null;
  listedAt: string | null;
  checkedAt: string | null;
  checkedFans: number | null;
  listedFans: number | null;
  ticketUrl: string | null;
  checkerSubmissions: number | null;
  checkerApproved: number | null;
}

/** What a bug item adds. */
export interface BugFacts {
  message: string | null;
  createdAt: string | null;
  handle: string | null;
  screenshot: string | null;
  issueUrl: string | null;
  device: string | null;
}

/** One crawl run a venue item lists (newest first). `status` is the run's own word. */
export interface RunLine {
  at: string;
  status: string;
  /** Why the run produced nothing; null when unrecorded or unknown to this build. */
  reason?: CrawlRunReason | null;
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
  /** An artist item's match facts; null on other kinds. */
  artistFacts: ArtistFacts | null;
  /** A low-confidence event item's facts; null on other kinds. */
  eventFacts: EventFacts | null;
  /** A price check item's facts; null on other kinds. */
  priceFacts: PriceFacts | null;
  /** A bug item's facts; null on other kinds. */
  bugFacts: BugFacts | null;
  /** A price batch's submissions (empty on other kinds). */
  submissionIds: string[];
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

const isRunReason = (value: unknown): value is CrawlRunReason =>
  RUN_REASONS.some((reason) => reason === value);

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
                reason: isRunReason(run['reason']) ? run['reason'] : null,
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

const textOf = (value: unknown): string | null =>
  isText(value) ? value : null;

const numberOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const candidateFrom = (value: unknown): ArtistCandidate[] =>
  isRecord(value) && isText(value['id']) && isText(value['name'])
    ? [
        {
          id: value['id'],
          name: value['name'],
          imageUrl: textOf(value['imageUrl']),
          genres: Array.isArray(value['genres'])
            ? value['genres'].filter(isText)
            : [],
          current: value['current'] === true,
          exact: value['exact'] === true,
          playsDenver: value['playsDenver'] === true,
        },
      ]
    : [];

const artistFactsFrom = (value: Record<string, unknown>): ArtistFacts => ({
  nextShowVenue: textOf(value['nextShowVenue']),
  spotifyArtistId: textOf(value['spotifyArtistId']),
  photoUrl: textOf(value['photoUrl']),
  reportReasons: Array.isArray(value['reportReasons'])
    ? value['reportReasons'].filter(isText)
    : [],
  candidates: Array.isArray(value['candidates'])
    ? value['candidates'].flatMap(candidateFrom)
    : [],
});

const eventFactsFrom = (value: Record<string, unknown>): EventFacts => ({
  eventId: textOf(value['eventId']),
  artist: textOf(value['artist']),
  description: textOf(value['description']),
  confidence: numberOf(value['confidence']),
  autoApproveBar: numberOf(value['autoApproveBar']),
  priceMin: textOf(value['priceMin']),
  priceMax: textOf(value['priceMax']),
});

const priceFactsFrom = (value: Record<string, unknown>): PriceFacts => ({
  listed: textOf(value['listedPrice']),
  listedMax: textOf(value['listedMax']),
  checked: textOf(value['checkedPrice']),
  checkedMax: textOf(value['checkedMax']),
  tier: textOf(value['tier']),
  listedAt: textOf(value['listedAt']),
  checkedAt: textOf(value['checkedAt']),
  checkedFans: numberOf(value['checkedFans']),
  // The listed price's backing fans come as an evidence line.
  listedFans: numberOf(
    Number(
      evidenceFrom(value['evidence']).find(
        (line) => line.label === 'Fans backing the listed price',
      )?.value,
    ),
  ),
  ticketUrl: textOf(value['ticketUrl']),
  checkerSubmissions: numberOf(value['checkerSubmissions']),
  checkerApproved: numberOf(value['checkerApproved']),
});

const bugFactsFrom = (value: Record<string, unknown>): BugFacts => ({
  message: textOf(value['message']),
  createdAt: textOf(value['createdAt']),
  handle: textOf(value['handle']),
  screenshot: textOf(value['screenshot']),
  issueUrl: textOf(value['issueUrl']),
  device: textOf(value['device']),
});

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
    artistFacts: value['kind'] === 'artist' ? artistFactsFrom(value) : null,
    eventFacts:
      value['kind'] === 'event-low-confidence' ? eventFactsFrom(value) : null,
    priceFacts: value['kind'] === 'price-check' ? priceFactsFrom(value) : null,
    bugFacts: value['kind'] === 'bug' ? bugFactsFrom(value) : null,
    submissionIds: Array.isArray(value['submissionIds'])
      ? value['submissionIds'].filter(isText)
      : [],
  };
};

const factsFrom = (value: unknown): AllClearFacts | null => {
  if (
    !isRecord(value) ||
    // Null outside production, where no daily crawl runs.
    !(value['nextCrawlAt'] === null || isText(value['nextCrawlAt'])) ||
    !isCount(value['snoozed']) ||
    !(value['nextBackAt'] === null || isText(value['nextBackAt']))
  )
    return null;
  const nextCrawlAt = value['nextCrawlAt'];
  const last = value['lastCrawl'];
  if (last === null)
    return {
      lastCrawl: null,
      nextCrawlAt,
      snoozed: value['snoozed'],
      nextBackAt: value['nextBackAt'],
    };
  if (
    !isRecord(last) ||
    !isCount(last['ok']) ||
    !isCount(last['total']) ||
    !isText(last['at'])
  )
    return null;
  return {
    lastCrawl: { ok: last['ok'], total: last['total'], at: last['at'] },
    nextCrawlAt,
    snoozed: value['snoozed'],
    nextBackAt: value['nextBackAt'],
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
  /** The All clear card's facts. Read only once the queue is empty. */
  facts: async (): Promise<AllClearFacts> => {
    const facts = factsFrom(await call(getToken, '/v1/admin/needs-you/facts'));
    if (!facts) throw new Error('needs-you facts');
    return facts;
  },
  /** One answer. `auditId` is what Undo points at; null when it can't be undone. */
  /** `params` are the answer's own fields (a picked artist, a reason). */
  answer: async (
    key: string,
    slug: string,
    params?: AnswerParams,
  ): Promise<AnswerResult> => {
    const data = await call(
      getToken,
      `/v1/admin/needs-you/items/${encodeURIComponent(key)}/answer`,
      { method: 'POST', body: { ...params, answer: slug } },
    );
    if (!isRecord(data)) throw new Error('needs-you answer');
    const auditId = isText(data['auditId']) ? data['auditId'] : null;
    return {
      auditId,
      undoable: data['undoable'] === true && auditId !== null,
      watchersNotified: toldFrom(data['result']),
    };
  },
  /**
   * Keep paused / Pause crawling with the Pause panel's own body (reason, note,
   * resume). The API takes the same body as the venue's pause route.
   */
  pause: async (
    key: string,
    slug: string,
    body: CrawlPauseRequest,
  ): Promise<AnswerResult> => {
    const data = await call(
      getToken,
      `/v1/admin/needs-you/items/${encodeURIComponent(key)}/answer`,
      { method: 'POST', body: { ...body, answer: slug } },
    );
    if (!isRecord(data)) throw new Error('needs-you pause');
    const auditId = isText(data['auditId']) ? data['auditId'] : null;
    return {
      auditId,
      undoable: data['undoable'] === true && auditId !== null,
      watchersNotified: null,
    };
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
  /** Takes a timed snooze back: the item returns to the queue. */
  unsnooze: async (key: string): Promise<void> => {
    await call(
      getToken,
      `/v1/admin/needs-you/items/${encodeURIComponent(key)}/snooze`,
      { method: 'DELETE' },
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
  /** Watchers actually told by a notifying answer; null when none are reported. */
  watchersNotified: number | null;
}

/** The notified count in an answer's `result`, when the API sent one. */
const toldFrom = (result: unknown): number | null =>
  isRecord(result) && isCount(result['watchersNotified'])
    ? result['watchersNotified']
    : null;

export type NeedsYouApi = ReturnType<typeof needsYouApi>;
