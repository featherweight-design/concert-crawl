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
} from '@concert-crawl/types';
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
  errorMessage: string | null;
  createdAt: Date;
}

export interface BatchTriggerInput {
  id: string;
  venueId: string;
  triggeredBy: string | null;
  status: 'pending' | 'processing' | 'done' | 'failed';
  crawlRunId: string | null;
  createdAt: Date;
}

export type ParsedBatchKey =
  | { kind: 'nightly'; night: string }
  | { kind: 'by_hand'; actor: string; epoch: number };

const NIGHT_KEY = /^nightly:(\d{4}-\d{2}-\d{2})$/;
const BY_HAND_KEY = /^by_hand:(.{1,255}):(\d{1,12})$/;

export const nightlyKey = (night: string): string => `nightly:${night}`;

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

const countRuns = (runs: readonly BatchRunInput[]): CrawlBatchCounts => {
  const counts: CrawlBatchCounts = {
    ok: 0,
    notOk: 0,
    unchanged: 0,
    skipped: 0,
    total: runs.length,
  };
  for (const run of runs) {
    if (run.status === 'success') counts.ok += 1;
    else if (run.status === 'skipped' && run.reason === 'page_unchanged') {
      counts.unchanged += 1;
    } else if (run.status === 'skipped' && run.reason === 'crawl_paused') {
      counts.skipped += 1;
    } else counts.notOk += 1;
  }
  return counts;
};

const sum = (
  runs: readonly BatchRunInput[],
  pick: (run: BatchRunInput) => number,
) => runs.reduce((total, run) => total + pick(run), 0);

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

/** How many waves of runs a night had: a new one starts after a long gap. */
const waveCount = (sorted: readonly BatchRunInput[]): number => {
  let waves = sorted.length > 0 ? 1 : 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (
      previous !== undefined &&
      current !== undefined &&
      current.createdAt.getTime() - previous.createdAt.getTime() > WAVE_GAP_MS
    ) {
      waves += 1;
    }
  }
  return waves;
};

export interface GroupInput {
  runs: readonly BatchRunInput[];
  triggers: readonly BatchTriggerInput[];
  now: Date;
}

/** Every batch in the input, newest first. */
export const groupCrawlBatches = ({
  runs,
  triggers,
  now,
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
        retried: waveCount(sorted) > 1,
        didntStart: false,
        runs: sorted.map(toRun),
      },
    });
  }

  // Didn't start: a night after the first one we have, with no scheduled run.
  const firstNight = [...nights.keys()].sort()[0];
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
          counts: { ok: 0, notOk: 0, unchanged: 0, skipped: 0, total: 0 },
          eventsFound: 0,
          eventsInserted: 0,
          pending: 0,
          retried: false,
          didntStart: true,
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
    batches.push({
      sortAt: first.createdAt.getTime(),
      batch: {
        key: `by_hand:${actor ?? 'unknown'}:${Math.floor(first.createdAt.getTime() / 1000)}`,
        kind: 'by_hand',
        startedAt: first.createdAt.toISOString(),
        endedAt: (endOf(burstRuns) ?? first.createdAt).toISOString(),
        night: null,
        actor,
        venueCount: new Set(burst.map((trigger) => trigger.venueId)).size,
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
        runs: burstRuns.map(toRun),
      },
    });
  }

  return batches
    .sort((left, right) => right.sortAt - left.sortAt)
    .map((entry) => entry.batch);
};
