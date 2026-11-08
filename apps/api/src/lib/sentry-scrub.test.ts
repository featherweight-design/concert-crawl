import { describe, expect, it } from 'vitest';
import type { ErrorEvent } from '@sentry/hono/node';
import {
  redactInviteTokens,
  scrubEvent,
  scrubRequestBody,
} from './sentry-scrub.js';

describe('scrubRequestBody', () => {
  it('redacts email fields', () => {
    expect(scrubRequestBody('{"email":"hugh@example.com"}')).toBe(
      '{"email":"[Redacted]"}',
    );
  });

  it('redacts token and secret-like fields regardless of casing', () => {
    const scrubbed = scrubRequestBody(
      '{"token":"abc","recipientEmail":"a@b.co","apiKey":"xyz"}',
    );
    expect(scrubbed).not.toContain('abc');
    expect(scrubbed).not.toContain('a@b.co');
    expect(scrubbed).not.toContain('xyz');
  });

  it('leaves non-sensitive fields intact', () => {
    expect(scrubRequestBody('{"theme":"dark","count":3}')).toBe(
      '{"theme":"dark","count":3}',
    );
  });

  it('redacts nested and array-wrapped sensitive fields', () => {
    expect(
      scrubRequestBody('{"users":[{"email":"a@b.co","name":"Ada"}]}'),
    ).toBe('{"users":[{"email":"[Redacted]","name":"Ada"}]}');
  });

  it('returns malformed bodies untouched so payloads stay readable', () => {
    const payload = '{"theme":"%20or%203%3d3%20--"';
    expect(scrubRequestBody(payload)).toBe(payload);
  });
});

describe('scrubEvent', () => {
  it('scrubs the request body on the event', () => {
    const event: ErrorEvent = {
      type: undefined,
      request: { data: '{"email":"hugh@example.com"}' },
    };
    expect(scrubEvent(event).request?.data).toBe('{"email":"[Redacted]"}');
  });

  it('passes through events with no request body', () => {
    const event: ErrorEvent = { type: undefined };
    expect(scrubEvent(event)).toBe(event);
  });

  it('drops the user from every event', () => {
    const event: ErrorEvent = {
      type: undefined,
      user: { id: 'user_2abc', ip_address: '203.0.113.7' },
    };
    expect(scrubEvent(event).user).toBeUndefined();
  });

  it('redacts a crew invite token from the request URL and transaction', () => {
    const event: ErrorEvent = {
      type: undefined,
      request: {
        url: 'https://api.example.com/v1/crew-invites/tok_secret?x=1',
      },
      transaction: 'GET /v1/crew-invites/tok_secret',
    };
    const scrubbed = scrubEvent(event);
    expect(scrubbed.request?.url).toBe(
      'https://api.example.com/v1/crew-invites/[Redacted]?x=1',
    );
    expect(scrubbed.transaction).toBe('GET /v1/crew-invites/[Redacted]');
  });
});

describe('redactInviteTokens', () => {
  it('leaves URLs without an invite token untouched', () => {
    expect(redactInviteTokens('/v1/crews/123/members')).toBe(
      '/v1/crews/123/members',
    );
  });
});
