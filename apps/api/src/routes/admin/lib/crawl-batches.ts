// Crawl runs, grouped into batches for the admin Crawl runs list (1d). Pure:
// the routes read runs and triggers and hand them here. A batch is derived,
// never stored.
//
//   nightly   the scheduled crawl's runs: crawl_runs that no crawl_trigger
//             points at, grouped by the Mountain Time night they ran on. A
//             night whose runs come in more than one wave (a gap over an hour)
//             was retried: the scheduled run, then the backup dispatch.
//   by_hand   crawl_triggers an admin queued, grouped into bursts (one person,
//             triggers less than ten minutes apart), with the runs they made.
//   Didn't start   a night with no scheduled run at all, derived from the
//             calendar: the run should have been there by 6 AM Mountain.

import type {
  CrawlBatchCounts,
  CrawlBatchDetail,
  CrawlBatchRun,
  CrawlRunReason,
  CrawlStatus,
  UsualNightly,
} from '@concert-crawl/types';
import { createHash } from 'node:crypto';
import { addDays, denverDate } from './needs-you/keys.js';

/** Triggers by one person closer together than this are one by-hand batch. */
export const BURST_GAP_MS = 10 * 60 * 1000;
/** An unlinked trigger claims a run on its venue starting within this long. */
export const TRIGGER_CLAIM_WINDOW_MS = 6 * 60 * 60 * 1000;
/** A gap this long inside a night starts a new wave: a retry of the night. */
export const WAVE_GAP_MS = 60 * 60 * 1000;
/** After this Mountain hour a night with no scheduled run did not start. */
export const NIGHT_DEADLINE_HOUR_MT = 6;

export interface BatchRunInput {
  id: string;
  venueId: string;
  venueName: string | null;
  status: CrawlStatus;
  reason: CrawlRunReason | null;
  eventsFound: number;
  eventsInserted: number;
  durationMs: number | null;
  /** Haiku spend for the run; summed into a batch's costUsd, not sent per run. */
  llmCostUsd: number | null;
  errorMessage: string | null;
  createdAt: Date;
}

export interface BatchTriggerInput {
  id: string;
  venueId: string;
  /** The trigger's venue, so a one-venue batch is named before its run lands. */
  venueName: string | null;
  triggeredBy: string | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
  crawlRunId: string | null;
  createdAt: Date;
}

/**
 * A by-hand key from a URL (`run:<epoch>:<tag>`) carries no Clerk id, only
 * `actorTag`'s short hash of it. A bare `run:<epoch>` (no tag) still works:
 * it names the first by-hand batch that started in that second.
 */
export type ParsedBatchKey =
  | { kind: 'nightly'; night: string }
  | {
      kind: 'by_hand';
      actor: string | null;
      epoch: number;
      tag?: string | null;
    };

const NIGHT_KEY = /^nightly:(\d{4}-\d{2}-\d{2})$/;
const BY_HAND_KEY = /^by_hand:(.{1,255}):(\d{1,12})$/;
const RUN_KEY = /^run:(\d{1,12})(?::([0-9a-f]{8}))?$/;

export const nightlyKey = (night: string): string => `nightly:${night}`;

const epochOf = (at: Date): number => Math.floor(at.getTime() / 1000);

/**
 * Tells two actors' batches in one second apart in a link key, without
 * putting the Clerk id in a URL: the first 8 hex of its SHA-256.
 */
export const actorTag = (actor: string | null): string =>
  createHash('sha256')
    .update(actor ?? 'unknown')
    .digest('hex')
    .slice(0, 8);

/** True when `batch` is the one the parsed key names. */
export const batchMatchesKey = (
  batch: Pick<CrawlBatchDetail, 'key' | 'kind' | 'startedAt' | 'actor'>,
  key: string,
  parsed: ParsedBatchKey,
): boolean => {
  if (batch.key === key) return true;
  return (
    parsed.kind === 'by_hand' &&
    parsed.actor === null &&
    batch.kind === 'by_hand' &&
    batch.startedAt !== null &&
    epochOf(new Date(batch.startedAt)) === parsed.epoch &&
    ((parsed.tag ?? null) === null || parsed.tag === actorTag(batch.actor))
  );
};

/**
 * Where a batch sorts, epoch ms: its start, or noon UTC of a night that did
 * not start. The list orders and pages by it.
 */
export const batchSortAt = (
  batch: Pick<CrawlBatchDetail, 'startedAt' | 'night'>,
): number => {
  if (batch.startedAt !== null) return Date.parse(batch.startedAt);
  return batch.night === null ? 0 : Date.parse(`${batch.night}T12:00:00Z`);
};

export const parseBatchKey = (key: string): ParsedBatchKey | null => {
  const night = NIGHT_KEY.exec(key);
  if (night?.[1] !== undefined) {
    // Reject 2026-02-30 and friends: the date must survive a round trip.
    const parsed = new Date(`${night[1]}T00:00:00Z`);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== night[1]
    ) {
      return null;
    }
    return { kind: 'nightly', night: night[1] };
  }
  const byHand = BY_HAND_KEY.exec(key);
  if (byHand?.[1] !== undefined && byHand[2] !== undefined) {
    return { kind: 'by_hand', actor: byHand[1], epoch: Number(byHand[2]) };
  }
  const run = RUN_KEY.exec(key);
  if (run?.[1] !== undefined) {
    return {
      kind: 'by_hand',
      actor: null,
      epoch: Number(run[1]),
      tag: run[2] ?? null,
    };
  }
  return null;
};

const mountainHour = (now: Date): number =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Denver',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  );

const toRun = (run: BatchRunInput): CrawlBatchRun => ({
  id: run.id,
  venueId: run.venueId,
  venueName: run.venueName,
  status: run.status,
  reason: run.reason,
  eventsFound: run.eventsFound,
  eventsInserted: run.eventsInserted,
  durationMs: run.durationMs,
  errorMessage: run.errorMessage,
  createdAt: run.createdAt.toISOString(),
});

const EMPTY_COUNTS: CrawlBatchCounts = {
  ok: 0,
  notOk: 0,
  unchanged: 0,
  skipped: 0,
  total: 0,
  failed: 0,
  blocked: 0,
};

/** Failed runs the chip names otherwise: robots.txt, or Not run. */
const NOT_FAILED_REASONS = new Set<string>([
  'robots_disallowed',
  'robots_unreachable',
  'robots_crawl_delay',
  'llm_account',
]);

const countRuns = (runs: readonly BatchRunInput[]): CrawlBatchCounts => {
  const counts: CrawlBatchCounts = { ...EMPTY_COUNTS, total: runs.length };
  for (const run of runs) {
    if (run.status === 'success') counts.ok += 1;
    else if (run.status === 'skipped' && run.reason === 'page_unchanged') {
      counts.unchanged += 1;
    } else if (run.status === 'skipped' && run.reason === 'crawl_paused') {
      counts.skipped += 1;
    } else {
      counts.notOk += 1;
      // The run chip's split (runOutcomeKey): the reason wins over the status.
      if (run.reason === 'blocked_http') counts.blocked += 1;
      else if (
        run.status === 'failed' &&
        !NOT_FAILED_REASONS.has(run.reason ?? '')
      ) {
        counts.failed += 1;
      }
    }
  }
  return counts;
};

const sum = (
  runs: readonly BatchRunInput[],
  pick: (run: BatchRunInput) => number,
) => runs.reduce((total, run) => total + pick(run), 0);

/** Spend to a hundredth of a cent, so float noise never reaches the wire. */
const costOf = (runs: readonly BatchRunInput[]): number =>
  Math.round(sum(runs, (run) => run.llmCostUsd ?? 0) * 10_000) / 10_000;

const endOf = (runs: readonly BatchRunInput[]): Date | null => {
  let latest: number | null = null;
  for (const run of runs) {
    const end = run.createdAt.getTime() + (run.durationMs ?? 0);
    if (latest === null || end > latest) latest = end;
  }
  return latest === null ? null : new Date(latest);
};

const byTime = (left: BatchRunInput, right: BatchRunInput): number =>
  left.createdAt.getTime() - right.createdAt.getTime();

/**
 * Where a night's second wave starts (the first run after a long gap), or -1
 * in one wave. Everything from there on is the retry.
 */
const retryStart = (sorted: readonly BatchRunInput[]): number => {
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      current.createdAt.getTime() - previous.createdAt.getTime() > WAVE_GAP_MS
    ) {
      return index;
    }
  }
  return -1;
};

/** A night's retry waves on their own, or null in one wave. */
const retryOf = (
  sorted: readonly BatchRunInput[],
): CrawlBatchDetail['retry'] => {
  const start = retryStart(sorted);
  const first = sorted[start];
  if (start < 0 || first === undefined) return null;
  return {
    at: first.createdAt.toISOString(),
    counts: countRuns(sorted.slice(start)),
  };
};

/**
 * POST /v1/admin/crawl writes every trigger in one statement, so they share a
 * created_at to the microsecond; a re-crawl writes one per request. Two or
 * more at one instant is a Crawl all.
 */
const isCrawlAll = (burst: readonly BatchTriggerInput[]): boolean => {
  const seen = new Set<number>();
  return burst.some((trigger) => {
    const at = trigger.createdAt.getTime();
    if (seen.has(at)) return true;
    seen.add(at);
    return false;
  });
};

export interface GroupInput {
  runs: readonly BatchRunInput[];
  triggers: readonly BatchTriggerInput[];
  now: Date;
  /**
   * Derive Didn't start from this night on even when the input has no
   * earlier nightly: for a read window with history behind it, whose oldest
   * nights may simply have had no runs.
   */
  didntStartFrom?: string | undefined;
}

/** Every batch in the input, newest first. */
export const groupCrawlBatches = ({
  runs,
  triggers,
  now,
  didntStartFrom,
}: GroupInput): CrawlBatchDetail[] => {
  const triggerRunIds = new Set(
    triggers.flatMap((trigger) =>
      trigger.crawlRunId === null ? [] : [trigger.crawlRunId],
    ),
  );
  // The crawler writes a trigger's crawl_run_id only after the venue's whole
  // run (prices, fan-out) is done, so a run a trigger asked for can sit
  // unlinked for a while, or for good if that work threw. A run that starts
  // within a few hours of an unlinked trigger on its venue belongs to it.
  const claimedRunByTrigger = new Map<string, string>();
  const unlinked = triggers
    .filter(
      (trigger) =>
        trigger.crawlRunId === null &&
        (trigger.status === 'processing' || trigger.status === 'failed'),
    )
    .sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
    );
  for (const run of [...runs].sort(byTime)) {
    if (triggerRunIds.has(run.id)) continue;
    const trigger = unlinked.find(
      (candidate) =>
        !claimedRunByTrigger.has(candidate.id) &&
        candidate.venueId === run.venueId &&
        candidate.createdAt.getTime() <= run.createdAt.getTime() &&
        run.createdAt.getTime() - candidate.createdAt.getTime() <=
          TRIGGER_CLAIM_WINDOW_MS,
    );
    if (trigger !== undefined) {
      claimedRunByTrigger.set(trigger.id, run.id);
      triggerRunIds.add(run.id);
    }
  }
  const runById = new Map(runs.map((run) => [run.id, run]));
  const batches: { sortAt: number; batch: CrawlBatchDetail }[] = [];

  // Nightly: runs no trigger asked for, by Mountain Time night.
  const nights = new Map<string, BatchRunInput[]>();
  for (const run of runs) {
    if (triggerRunIds.has(run.id)) continue;
    const night = denverDate(run.createdAt);
    nights.set(night, [...(nights.get(night) ?? []), run]);
  }
  for (const [night, nightRuns] of nights) {
    const sorted = [...nightRuns].sort(byTime);
    const startedAt = sorted[0]?.createdAt ?? null;
    batches.push({
      sortAt: startedAt?.getTime() ?? 0,
      batch: {
        key: nightlyKey(night),
        kind: 'nightly',
        startedAt: startedAt?.toISOString() ?? null,
        endedAt: endOf(sorted)?.toISOString() ?? null,
        night,
        actor: null,
        venueCount: new Set(sorted.map((run) => run.venueId)).size,
        counts: countRuns(sorted),
        eventsFound: sum(sorted, (run) => run.eventsFound),
        eventsInserted: sum(sorted, (run) => run.eventsInserted),
        pending: 0,
        retried: retryStart(sorted) > 0,
        didntStart: false,
        costUsd: costOf(sorted),
        linkKey: nightlyKey(night),
        crawlAll: false,
        venueName: null,
        actorHandle: null,
        retry: retryOf(sorted),
        runs: sorted.map(toRun),
      },
    });
  }

  // Didn't start: a night after the first one we have (or didntStartFrom),
  // with no scheduled run.
  const firstNight = [
    ...nights.keys(),
    ...(didntStartFrom === undefined ? [] : [didntStartFrom]),
  ].sort()[0];
  if (firstNight !== undefined) {
    const today = denverDate(now);
    const lastDue =
      mountainHour(now) >= NIGHT_DEADLINE_HOUR_MT ? today : addDays(today, -1);
    for (let night = firstNight; night <= lastDue; night = addDays(night, 1)) {
      if (nights.has(night)) continue;
      batches.push({
        // Noon UTC of the date: sorts it where the night would have been.
        sortAt: Date.parse(`${night}T12:00:00Z`),
        batch: {
          key: nightlyKey(night),
          kind: 'nightly',
          startedAt: null,
          endedAt: null,
          night,
          actor: null,
          venueCount: 0,
          counts: { ...EMPTY_COUNTS },
          eventsFound: 0,
          eventsInserted: 0,
          pending: 0,
          retried: false,
          didntStart: true,
          costUsd: 0,
          linkKey: nightlyKey(night),
          crawlAll: false,
          venueName: null,
          actorHandle: null,
          retry: null,
          runs: [],
        },
      });
    }
  }

  // By hand: bursts of one person's triggers.
  const ordered = [...triggers].sort(
    (left, right) =>
      (left.triggeredBy ?? '').localeCompare(right.triggeredBy ?? '') ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  );
  const bursts: BatchTriggerInput[][] = [];
  for (const trigger of ordered) {
    const burst = bursts[bursts.length - 1];
    const previous = burst?.[burst.length - 1];
    if (
      burst !== undefined &&
      previous !== undefined &&
      previous.triggeredBy === trigger.triggeredBy &&
      trigger.createdAt.getTime() - previous.createdAt.getTime() <= BURST_GAP_MS
    ) {
      burst.push(trigger);
    } else {
      bursts.push([trigger]);
    }
  }
  for (const burst of bursts) {
    const first = burst[0];
    if (first === undefined) continue;
    const burstRuns = burst
      .flatMap((trigger) => {
        const runId = trigger.crawlRunId ?? claimedRunByTrigger.get(trigger.id);
        return runId === undefined ? [] : [runById.get(runId)];
      })
      .flatMap((run) => (run === undefined ? [] : [run]))
      .sort(byTime);
    const actor = first.triggeredBy;
    const venueIds = new Set(burst.map((trigger) => trigger.venueId));
    batches.push({
      sortAt: first.createdAt.getTime(),
      batch: {
        key: `by_hand:${actor ?? 'unknown'}:${epochOf(first.createdAt)}`,
        kind: 'by_hand',
        startedAt: first.createdAt.toISOString(),
        endedAt: (endOf(burstRuns) ?? first.createdAt).toISOString(),
        night: null,
        actor,
        venueCount: venueIds.size,
        counts: countRuns(burstRuns),
        eventsFound: sum(burstRuns, (run) => run.eventsFound),
        eventsInserted: sum(burstRuns, (run) => run.eventsInserted),
        pending: burst.filter(
          (trigger) =>
            trigger.crawlRunId === null &&
            !claimedRunByTrigger.has(trigger.id) &&
            (trigger.status === 'pending' || trigger.status === 'processing'),
        ).length,
        retried: false,
        didntStart: false,
        costUsd: costOf(burstRuns),
        linkKey: `run:${epochOf(first.createdAt)}:${actorTag(actor)}`,
        crawlAll: isCrawlAll(burst),
        venueName:
          venueIds.size === 1
            ? (first.venueName ?? burstRuns[0]?.venueName ?? null)
            : null,
        actorHandle: null,
        retry: null,
        runs: burstRuns.map(toRun),
      },
    });
  }

  return batches
    .sort((left, right) => right.sortAt - left.sortAt)
    .map((entry) => entry.batch);
};

/** How many recent nights the Crawl all estimate averages (addendum-3 row 17). */
export const ESTIMATE_NIGHTS = 7;

/**
 * What a full crawl usually takes: the average span and LLM cost of the last
 * ESTIMATE_NIGHTS nightly batches. Only whole nights count:
 *   - from `firstNight` on, the first night the read window holds in full
 *     (a window cut mid-night would average a short night);
 *   - before today, since a night's backup dispatch can land after the 6 AM
 *     deadline (12:07Z is 6:07 AM MDT), so today may still be one wave short;
 *   - in one wave: a retried night's span includes the wait for the retry.
 * Null with no such night, and the confirm then drops its time and cost line.
 */
export const usualNightly = ({
  firstNight,
  ...input
}: GroupInput & { firstNight: string }): UsualNightly | null => {
  const costById = new Map(
    input.runs.map((run) => [run.id, run.llmCostUsd ?? 0]),
  );
  const today = denverDate(input.now);
  const spans = groupCrawlBatches(input)
    .flatMap((batch) =>
      batch.kind === 'nightly' &&
      !batch.didntStart &&
      !batch.retried &&
      batch.night !== null &&
      batch.night >= firstNight &&
      batch.night < today &&
      batch.startedAt !== null &&
      batch.endedAt !== null
        ? [
            {
              durationMs:
                Date.parse(batch.endedAt) - Date.parse(batch.startedAt),
              costUsd: batch.runs.reduce(
                (total, run) => total + (costById.get(run.id) ?? 0),
                0,
              ),
            },
          ]
        : [],
    )
    .slice(0, ESTIMATE_NIGHTS);
  if (spans.length === 0) return null;
  const average = (pick: (span: (typeof spans)[number]) => number) =>
    spans.reduce((total, span) => total + pick(span), 0) / spans.length;
  return {
    durationMs: Math.round(average((span) => span.durationMs)),
    // To the cent: the confirm reads "about $0.80".
    costUsd: Math.round(average((span) => span.costUsd) * 100) / 100,
    nights: spans.length,
  };
};
