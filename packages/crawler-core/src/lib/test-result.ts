import type { TestCrawlResult, TestCrawlSample } from '@concert-crawl/db';
import type { NormalizedEvent } from '../types.js';

/** How many sample shows a test crawl keeps for the Review step. */
export const TEST_SAMPLE_LIMIT = 3;

type TestShow = Pick<NormalizedEvent, 'artist' | 'title' | 'date' | 'showTime'>;

const toSample = (show: TestShow): TestCrawlSample => ({
  artist: show.artist,
  title: show.title === '' ? null : show.title,
  date: show.date,
  showTime: show.showTime ?? null,
});

/**
 * Which stage of the cascade produced the shows. The cascade reports only the
 * winning stage, so the others read 0: JSON-LD for `structured_data`, Haiku
 * for `llm`, and the page's own markup for a platform adapter.
 */
const countsFor = (
  strategy: string,
  found: number,
): TestCrawlResult['counts'] => ({
  html: strategy.startsWith('platform:') ? found : 0,
  jsonLd: strategy === 'structured_data' ? found : 0,
  haiku: strategy === 'llm' ? found : 0,
});

/** The result of a test crawl that read the listing, whether or not it found shows. */
export const buildTestResult = (input: {
  strategy: string;
  shows: readonly TestShow[];
  costUsd: number | null;
  crawlRunId: string;
  durationMs: number;
}): TestCrawlResult => ({
  status: input.shows.length > 0 ? 'found' : 'none',
  strategy: input.strategy,
  found: input.shows.length,
  counts: countsFor(input.strategy, input.shows.length),
  samples: input.shows.slice(0, TEST_SAMPLE_LIMIT).map(toSample),
  costUsd: input.costUsd ?? 0,
  crawlRunId: input.crawlRunId,
  error: null,
  durationMs: input.durationMs,
});

/** The result of a test crawl that could not read the listing at all. */
export const buildFailedTestResult = (input: {
  error: string;
  crawlRunId: string | null;
}): TestCrawlResult => ({
  status: 'failed',
  strategy: null,
  found: 0,
  counts: { html: 0, jsonLd: 0, haiku: 0 },
  samples: [],
  costUsd: 0,
  crawlRunId: input.crawlRunId,
  error: input.error,
});
