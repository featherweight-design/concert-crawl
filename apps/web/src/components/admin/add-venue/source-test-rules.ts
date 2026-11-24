import type { TestCrawlResult } from '@concert-crawl/types';
import { ApiError } from '@/lib/api';

/**
 * The refusals `POST /v1/admin/crawl/:id` sends a draft's test crawl
 * (`{ test: true }`): the venue has already gone live (`not_draft`), a test is
 * already queued (`test_pending`), or robots.txt disallows the page. Any
 * other failure, a 400 included, is not a refusal and throws.
 */
const CODED_REFUSALS = [
  'not_draft',
  'test_pending',
  'robots_disallowed',
] as const;
export type TestRefusal = (typeof CODED_REFUSALS)[number];

export type TestOutcome =
  { ok: true; triggerId: string } | { ok: false; code: TestRefusal };

const isCodedRefusal = (code: unknown): code is TestRefusal =>
  CODED_REFUSALS.some((known) => known === code);

/** A test crawl's refusal, or null for any other failure. */
export const testRefusalOf = (err: unknown): TestRefusal | null => {
  if (!(err instanceof ApiError)) return null;
  if (err.status === 409 && isCodedRefusal(err.code)) return err.code;
  return null;
};

/** What Source's test card is showing. */
export type TestState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'found'; result: TestCrawlResult }
  | { kind: 'none' }
  | { kind: 'failed' }
  | { kind: 'timedOut' }
  | { kind: 'robots' }
  | { kind: 'refused'; code: Exclude<TestRefusal, 'robots_disallowed'> };

/** A settled trigger's card: its `testResult`, read for the state to draw. */
export const testStateOf = (
  result: TestCrawlResult | null | undefined,
): TestState => {
  if (!result) return { kind: 'failed' };
  if (result.status === 'found') return { kind: 'found', result };
  if (result.status === 'none') return { kind: 'none' };
  return { kind: 'failed' };
};

/** Samples shown on the card; the rest are counted. */
export const SAMPLE_LIMIT = 3;
