import { describe, expect, it } from 'vitest';
import type { TestCrawlResult } from '@concert-crawl/types';
import { ApiError } from '@/lib/api';
import {
  pendingTriggerOf,
  testRefusalOf,
  testStateOf,
} from './source-test-rules';

const result = (patch: Partial<TestCrawlResult>): TestCrawlResult => ({
  status: 'found',
  strategy: 'html',
  found: 2,
  counts: { html: 2, jsonLd: 0, haiku: 0 },
  samples: [],
  costUsd: 0,
  crawlRunId: null,
  error: null,
  ...patch,
});

describe('testRefusalOf', () => {
  it('names the three coded 409 refusals', () => {
    for (const code of ['not_draft', 'test_pending', 'robots_disallowed']) {
      expect(testRefusalOf(new ApiError(409, 'x', code))).toBe(code);
    }
  });

  it('leaves an unknown 409 and any other error unnamed', () => {
    expect(testRefusalOf(new ApiError(409, 'x', 'other'))).toBeNull();
    expect(testRefusalOf(new ApiError(400, 'x'))).toBeNull();
    expect(testRefusalOf(new ApiError(500, 'x'))).toBeNull();
    expect(testRefusalOf(new Error('boom'))).toBeNull();
  });
});

describe('pendingTriggerOf', () => {
  const pending = (body: unknown) =>
    new ApiError(
      409,
      'x',
      'test_pending',
      undefined,
      undefined,
      undefined,
      body,
    );

  it('reads the queued test a test_pending refusal names', () => {
    expect(pendingTriggerOf(pending({ triggerId: 'trg-1' }))).toBe('trg-1');
  });

  it('leaves an API that sends no id, and every other failure, unnamed', () => {
    expect(pendingTriggerOf(pending({ code: 'test_pending' }))).toBeNull();
    expect(pendingTriggerOf(pending({ triggerId: '' }))).toBeNull();
    expect(pendingTriggerOf(pending(undefined))).toBeNull();
    expect(
      pendingTriggerOf(
        new ApiError(409, 'x', 'not_draft', undefined, undefined, undefined, {
          triggerId: 'trg-1',
        }),
      ),
    ).toBeNull();
    expect(pendingTriggerOf(new Error('boom'))).toBeNull();
  });
});

describe('testStateOf', () => {
  it('reads found, none and failed from the result', () => {
    expect(testStateOf(result({})).kind).toBe('found');
    expect(testStateOf(result({ status: 'none', found: 0 })).kind).toBe('none');
    expect(testStateOf(result({ status: 'failed' })).kind).toBe('failed');
  });

  it('calls a trigger with no result failed', () => {
    expect(testStateOf(null).kind).toBe('failed');
  });
});
