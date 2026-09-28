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
      'TimeoutError: page.goto: Timeout 45000ms exceeded navigating to https://b.example.com/shows',
    )
    expect(first).toBe(second)
  })

  it('keeps short status codes apart: HTTP 403 and HTTP 500 are different causes', () => {
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
