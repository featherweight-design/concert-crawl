# PR 1a — classify errors and evaluate run health (Tasks 1–2)

> Part of the crawl run observability plan. **Read [`00-index.md`](00-index.md) first** — its Global Constraints apply to every task here, and its Background is the spec.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

### Task 1: The shared error classifier

**Files:**

- Create: `packages/crawler-core/src/lib/crawl-error-class.ts`
- Test: `packages/crawler-core/src/lib/crawl-error-class.test.ts`

**Interfaces — Produces:**

```ts
export type CrawlErrorKind = 'llm_quota' | 'other'
export interface CrawlErrorClass {
  kind: CrawlErrorKind
  key: string
}
export function normalizeErrorMessage(message: string): string
export function classifyCrawlError(message: string): CrawlErrorClass
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import {
  classifyCrawlError,
  normalizeErrorMessage,
} from './crawl-error-class.js'

// Verbatim from Sentry CONCERT-CRAWL-CRAWLER-2, 2026-09-28.
const QUOTA =
  'Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC."},"request_id":"req_011CfVZygV4btimyebqFAtze"}'

describe('classifyCrawlError', () => {
  it('recognises the account usage-limit refusal', () => {
    expect(classifyCrawlError(QUOTA)).toEqual({
      kind: 'llm_quota',
      key: 'llm_quota',
    })
  })

  it('recognises the exhausted-credit refusal as the same class', () => {
    const credit =
      'Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}'
    expect(classifyCrawlError(credit).kind).toBe('llm_quota')
  })

  it('keys an unknown error on its normalized message', () => {
    expect(classifyCrawlError('TypeError: fetch failed')).toEqual({
      kind: 'other',
      key: 'TypeError: fetch failed',
    })
  })
})

describe('normalizeErrorMessage', () => {
  it('collapses per-venue URLs and long numbers so one cause shares one key', () => {
    const first = normalizeErrorMessage(
      'TimeoutError: page.goto: Timeout 30000ms exceeded navigating to https://a.example.com/events',
    )
    const second = normalizeErrorMessage(
      'TimeoutError: page.goto: Timeout 30000ms exceeded navigating to https://b.example.com/shows',
    )
    expect(first).toBe(second)
  })

  it('keeps short status codes apart — HTTP 403 and HTTP 500 are different causes', () => {
    expect(normalizeErrorMessage('HTTP 403')).not.toBe(
      normalizeErrorMessage('HTTP 500'),
    )
  })

  it('strips request ids and uuids and caps the length', () => {
    const out = normalizeErrorMessage(
      `req_011CfVZygV4btimyebqFAtze 3f2b1c9e-8d4a-4f6b-9c1d-2e3f4a5b6c7d ${'x'.repeat(400)}`,
    )
    expect(out).not.toContain('req_011')
    expect(out).not.toContain('3f2b1c9e')
    expect(out.length).toBeLessThanOrEqual(160)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @concert-crawl/crawler-core test -- crawl-error-class`
Expected: FAIL — cannot resolve `./crawl-error-class.js`.

- [ ] **Step 3: Implement**

```ts
// Turns a crawl error message into a stable class. Shared by the run-level
// health check (run-health.ts), the Sentry capture sites (apps/crawler run.ts)
// and the three-strikes path (crawl.ts), so all three agree on what "the same
// failure" means.

export type CrawlErrorKind = 'llm_quota' | 'other'

export interface CrawlErrorClass {
  kind: CrawlErrorKind
  /** The kind itself for a known class; the normalized message otherwise. */
  key: string
}

// Anthropic's two account-level refusals, matched on their message text as the
// API returns it. Neither says anything about the venue: every LLM-extracted
// venue fails identically until the account recovers.
const LLM_QUOTA_PATTERNS: readonly RegExp[] = [
  /reached your specified API usage limits/i,
  /credit balance is too low/i,
]

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
const MAX_KEY_LENGTH = 160

/**
 * Strips what varies per venue or per request, so one cause across several
 * venues produces one key. Only digit runs of 4+ collapse: timeouts, ports
 * and timestamps vary, but a 3-digit status code is the cause itself.
 */
export function normalizeErrorMessage(message: string): string {
  return message
    .replace(/req_[A-Za-z0-9]+/g, 'req_*')
    .replace(UUID, '<uuid>')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/\d{4,}/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_KEY_LENGTH)
}

export function classifyCrawlError(message: string): CrawlErrorClass {
  if (LLM_QUOTA_PATTERNS.some((pattern) => pattern.test(message))) {
    return { kind: 'llm_quota', key: 'llm_quota' }
  }
  return { kind: 'other', key: normalizeErrorMessage(message) }
}
```

- [ ] **Step 4: Run to verify it passes** — same command, expected PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/crawler-core/src/lib/crawl-error-class.ts packages/crawler-core/src/lib/crawl-error-class.test.ts
git commit -m "feat(crawler): classify crawl errors into a shared kind and grouping key"
```

### Task 2: Evaluate run health (pure)

**Files:**

- Create: `packages/crawler-core/src/lib/run-health.ts`
- Test: `packages/crawler-core/src/lib/run-health.test.ts`

**Interfaces — Consumes:** `classifyCrawlError`, `CrawlErrorKind` (Task 1). **Produces:**

```ts
export const RUN_FAILURE_MIN_VENUES = 3
export const RUN_FAILURE_RATE = 0.25
export const SHARED_CAUSE_MIN_VENUES = 2
export interface VenueRunOutcome {
  venueId: string
  venueName: string
  errorMessage: string | null
}
export type RunDegradation =
  | { kind: 'failure_rate'; failed: number; total: number }
  | {
      kind: 'shared_cause'
      errorKey: string
      errorKind: CrawlErrorKind
      venueNames: string[]
    }
export function evaluateRunHealth(
  outcomes: readonly VenueRunOutcome[],
): RunDegradation[]
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { evaluateRunHealth, type VenueRunOutcome } from './run-health.js'

const QUOTA =
  'Error: 400 {"error":{"message":"You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC."}}'

const ok = (name: string): VenueRunOutcome => ({
  venueId: name,
  venueName: name,
  errorMessage: null,
})
const failed = (name: string, message: string): VenueRunOutcome => ({
  venueId: name,
  venueName: name,
  errorMessage: message,
})

describe('evaluateRunHealth', () => {
  it('reports nothing for a clean run', () => {
    expect(evaluateRunHealth([ok('A'), ok('B'), ok('C')])).toEqual([])
  })

  it('reports the 2026-09-28 run as both a failure rate and a shared cause', () => {
    const names = [
      'Red Rocks',
      'Cervantes',
      'Hi-Dive',
      'Larimer',
      'Globe Hall',
      'Lost Lake',
      'Ball Arena',
      'Meow Wolf',
    ]
    const outcomes = [
      ...names.map((name) => failed(name, QUOTA)),
      ...Array.from({ length: 12 }, (_, i) => ok(`ok-${i}`)),
    ]
    const result = evaluateRunHealth(outcomes)
    expect(result).toContainEqual({
      kind: 'failure_rate',
      failed: 8,
      total: 20,
    })
    expect(result).toContainEqual({
      kind: 'shared_cause',
      errorKey: 'llm_quota',
      errorKind: 'llm_quota',
      venueNames: [...names].sort(),
    })
  })

  it('stays quiet for one venue failing, which is ordinary (3 such days in 91)', () => {
    const outcomes = [
      failed('Larimer', 'TypeError: fetch failed'),
      ...Array.from({ length: 19 }, (_, i) => ok(`ok-${i}`)),
    ]
    expect(evaluateRunHealth(outcomes)).toEqual([])
  })

  it('counts distinct venues, not outcomes — one venue twice is not a shared cause', () => {
    // Defensive: the daily loop crawls each venue once, but a caller that merged
    // triggered and daily outcomes would not. Prod's only repeated-error day
    // (2026-07-18, Levitt Pavilion) was exactly that shape across two runs.
    const robots = 'VenuePilotFetchError: robots.txt disallows ConcertCrawl/1.0'
    const outcomes = [
      failed('Levitt', robots),
      failed('Levitt', robots),
      ok('A'),
      ok('B'),
    ]
    expect(
      evaluateRunHealth(outcomes).filter(
        (degradation) => degradation.kind === 'shared_cause',
      ),
    ).toEqual([])
  })

  it('flags two different venues failing on the same normalized error', () => {
    const outcomes = [
      failed(
        'A',
        'TimeoutError: Timeout 30000ms exceeded navigating to https://a.example.com',
      ),
      failed(
        'B',
        'TimeoutError: Timeout 30000ms exceeded navigating to https://b.example.com',
      ),
      ...Array.from({ length: 18 }, (_, i) => ok(`ok-${i}`)),
    ]
    const shared = evaluateRunHealth(outcomes).filter(
      (degradation) => degradation.kind === 'shared_cause',
    )
    expect(shared).toHaveLength(1)
  })

  it('needs 3 failures before the rate alone fires, so a tiny run cannot trip it', () => {
    expect(
      evaluateRunHealth([failed('A', 'x'), failed('B', 'y'), ok('C')]).filter(
        (degradation) => degradation.kind === 'failure_rate',
      ),
    ).toEqual([])
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `pnpm --filter @concert-crawl/crawler-core test -- run-health`; expected FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// Run-level health for the daily crawl. Every other crawl alert asks "is THIS
// venue broken?" and is gated on three strikes, so a failure shared by many
// venues on one night was silent in the app's own channels until the third
// night — by which point the three-strikes rule had already paused them
// (2026-09-28: 8 of 20 venues failed on one LLM quota error).
//
// Thresholds are sized from 91 days of prod crawl_runs: 86 clean days, 3 with
// one failure, one with the same venue failing twice, and 2026-09-28. These
// values fire on that last day only.

import { classifyCrawlError, type CrawlErrorKind } from './crawl-error-class.js'

/** The failure rate alone never fires below this many failed venues. */
export const RUN_FAILURE_MIN_VENUES = 3
export const RUN_FAILURE_RATE = 0.25
/** Distinct venues sharing one error key before it counts as a shared cause. */
export const SHARED_CAUSE_MIN_VENUES = 2

export interface VenueRunOutcome {
  venueId: string
  venueName: string
  /** null when the venue crawled successfully. */
  errorMessage: string | null
}

export type RunDegradation =
  | { kind: 'failure_rate'; failed: number; total: number }
  | {
      kind: 'shared_cause'
      errorKey: string
      errorKind: CrawlErrorKind
      venueNames: string[]
    }

type FailedOutcome = VenueRunOutcome & { errorMessage: string }

const isFailed = (outcome: VenueRunOutcome): outcome is FailedOutcome =>
  outcome.errorMessage !== null

export function evaluateRunHealth(
  outcomes: readonly VenueRunOutcome[],
): RunDegradation[] {
  const failures = outcomes.filter(isFailed)
  const total = outcomes.length
  const degradations: RunDegradation[] = []

  if (
    failures.length >= RUN_FAILURE_MIN_VENUES &&
    failures.length / total >= RUN_FAILURE_RATE
  ) {
    degradations.push({ kind: 'failure_rate', failed: failures.length, total })
  }

  // Keyed by venue id, defensively: the daily loop never crawls a venue twice,
  // but one venue must never masquerade as a shared cause if a caller ever
  // merges outcomes from more than one run.
  const byKey = new Map<
    string,
    { errorKind: CrawlErrorKind; venues: Map<string, string> }
  >()
  for (const failure of failures) {
    const { kind, key } = classifyCrawlError(failure.errorMessage)
    const group = byKey.get(key) ?? {
      errorKind: kind,
      venues: new Map<string, string>(),
    }
    group.venues.set(failure.venueId, failure.venueName)
    byKey.set(key, group)
  }
  for (const [errorKey, group] of byKey) {
    if (group.venues.size >= SHARED_CAUSE_MIN_VENUES) {
      degradations.push({
        kind: 'shared_cause',
        errorKey,
        errorKind: group.errorKind,
        venueNames: [...group.venues.values()].sort(),
      })
    }
  }
  return degradations
}
```

- [ ] **Step 4: Run to verify it passes.** Mutation-check: change `group.venues.set(failure.venueId, …)` to key on a counter; the Levitt test must fail. Restore.

- [ ] **Step 5: Commit** — `git commit -m "feat(crawler): evaluate daily-run health across venues"`
