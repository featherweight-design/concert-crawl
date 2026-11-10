import { describe, it, expect } from 'vitest';
import {
  classifyCrawlError,
  crawlFailureGrouping,
  normalizeErrorMessage,
} from './crawl-error-class.js';

// Verbatim from Sentry CONCERT-CRAWL-CRAWLER-2, 2026-09-28.
const QUOTA =
  'Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC."},"request_id":"req_011CfVZygV4btimyebqFAtze"}';

describe('classifyCrawlError', () => {
  it('recognises the account usage-limit refusal', () => {
    expect(classifyCrawlError(QUOTA)).toEqual({
      kind: 'llm_quota',
      key: 'llm_quota',
    });
  });

  it('recognises the exhausted-credit refusal as the same class', () => {
    const credit =
      'Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}';
    expect(classifyCrawlError(credit).kind).toBe('llm_quota');
  });

  // Both verbatim from https://platform.claude.com/docs/en/api/rate-limits
  // (2026-11-10). A workspace spend limit and the tier's monthly spend cap are
  // as account-wide as the org limit: no venue caused them.
  it('recognises the workspace spend-limit refusal', () => {
    const workspace =
      'Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"You have reached your specified workspace API usage limits. You will regain access on 2026-12-01 at 00:00 UTC."}}';
    expect(classifyCrawlError(workspace).kind).toBe('llm_quota');
  });

  it('recognises the tier spend-cap 429 as quota, not a rate limit', () => {
    const tierCap =
      'Error: 429 {"type":"error","error":{"type":"rate_limit_error","message":"You have reached your API usage limits: your organization has crossed its monthly API usage threshold, set based on your organization\'s API tier. You will regain access on 2026-09-01 at 00:00 UTC.","details":{"error_code":"enforced_spend_limit_reached"}},"request_id":"req_018EeWyXxfu5pfWkrYcMdjWG"}';
    expect(classifyCrawlError(tierCap).kind).toBe('llm_quota');
  });

  it('leaves an ordinary rate-limit 429 as a venue-level failure', () => {
    const rateLimit =
      'Error: 429 {"type":"error","error":{"type":"rate_limit_error","message":"Number of request tokens has exceeded your per-minute rate limit"}}';
    expect(classifyCrawlError(rateLimit).kind).toBe('other');
  });

  it('keys an unknown error on its normalized message', () => {
    expect(classifyCrawlError('TypeError: fetch failed')).toEqual({
      kind: 'other',
      key: 'TypeError: fetch failed',
    });
  });
});

describe('normalizeErrorMessage', () => {
  it('collapses per-venue URLs and long numbers so one cause shares one key', () => {
    const first = normalizeErrorMessage(
      'TimeoutError: page.goto: Timeout 30000ms exceeded navigating to https://a.example.com/events',
    );
    const second = normalizeErrorMessage(
      'TimeoutError: page.goto: Timeout 45000ms exceeded navigating to https://b.example.com/shows',
    );
    expect(first).toBe(second);
  });

  it('keeps short status codes apart: HTTP 403 and HTTP 500 are different causes', () => {
    expect(normalizeErrorMessage('HTTP 403')).not.toBe(
      normalizeErrorMessage('HTTP 500'),
    );
  });

  it('strips request ids and uuids and caps the length', () => {
    const out = normalizeErrorMessage(
      `req_011CfVZygV4btimyebqFAtze 3f2b1c9e-8d4a-4f6b-9c1d-2e3f4a5b6c7d ${'x'.repeat(400)}`,
    );
    expect(out).not.toContain('req_011');
    expect(out).not.toContain('3f2b1c9e');
    expect(out.length).toBeLessThanOrEqual(160);
  });
});

describe('crawlFailureGrouping', () => {
  it('fingerprints on the class, so one cause is one Sentry issue', () => {
    expect(crawlFailureGrouping(QUOTA)).toEqual({
      fingerprint: ['crawl.failed', 'llm_quota'],
      errorKind: 'llm_quota',
    });
  });

  it('gives different causes different fingerprints', () => {
    expect(crawlFailureGrouping('HTTP 403').fingerprint).not.toEqual(
      crawlFailureGrouping('HTTP 500').fingerprint,
    );
  });
});
