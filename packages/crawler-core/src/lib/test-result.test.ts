import { describe, it, expect } from 'vitest';
import { buildFailedTestResult, buildTestResult } from './test-result.js';

const show = (artist: string) => ({
  artist,
  title: artist,
  date: '2026-12-01',
  showTime: '20:00',
});

describe('buildTestResult', () => {
  it('credits the winning stage and keeps three samples', () => {
    const result = buildTestResult({
      strategy: 'structured_data',
      shows: ['A', 'B', 'C', 'D'].map(show),
      costUsd: null,
      crawlRunId: 'run-1',
    });
    expect(result).toMatchObject({
      status: 'found',
      found: 4,
      counts: { html: 0, jsonLd: 4, haiku: 0 },
      costUsd: 0,
      error: null,
    });
    expect(result.samples).toHaveLength(3);
  });

  it('credits a platform adapter to the page markup, and Haiku to llm', () => {
    const platform = buildTestResult({
      strategy: 'platform:aeg',
      shows: [show('A')],
      costUsd: 0,
      crawlRunId: 'run-2',
    });
    expect(platform.counts).toEqual({ html: 1, jsonLd: 0, haiku: 0 });
    const llm = buildTestResult({
      strategy: 'llm',
      shows: [show('A')],
      costUsd: 0.002,
      crawlRunId: 'run-3',
    });
    expect(llm.counts).toEqual({ html: 0, jsonLd: 0, haiku: 1 });
    expect(llm.costUsd).toBe(0.002);
  });

  it('reads no shows as none, and a blank title as null', () => {
    expect(
      buildTestResult({
        strategy: 'llm',
        shows: [],
        costUsd: 0,
        crawlRunId: 'run-4',
      }).status,
    ).toBe('none');
    const [sample] = buildTestResult({
      strategy: 'llm',
      shows: [{ ...show('A'), title: '' }],
      costUsd: 0,
      crawlRunId: 'run-5',
    }).samples;
    expect(sample?.title).toBeNull();
  });
});

describe('buildFailedTestResult', () => {
  it('carries the error and no counts', () => {
    expect(
      buildFailedTestResult({ error: 'boom', crawlRunId: 'run-6' }),
    ).toMatchObject({
      status: 'failed',
      found: 0,
      strategy: null,
      error: 'boom',
    });
  });
});
