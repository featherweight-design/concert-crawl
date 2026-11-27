import { describe, expect, it } from 'vitest';

import {
  beforeBreadcrumb,
  beforeSend,
  redactInviteTokens,
} from './sentry-redact';

const TOKEN = 'abc123XYZtoken';

describe('redactInviteTokens', () => {
  it('redacts the token from the API path', () => {
    expect(
      redactInviteTokens(`https://api.example.com/v1/crew-invites/${TOKEN}`),
    ).toBe('https://api.example.com/v1/crew-invites/[redacted]');
  });

  it('redacts the token from the join sub-path', () => {
    expect(redactInviteTokens(`/v1/crew-invites/${TOKEN}/join`)).toBe(
      '/v1/crew-invites/[redacted]/join',
    );
  });

  it('redacts the token from the landing route', () => {
    expect(
      redactInviteTokens(`https://app.example.com/crew/join/${TOKEN}`),
    ).toBe('https://app.example.com/crew/join/[redacted]');
  });

  it('leaves unrelated crew URLs legible', () => {
    const url = '/v1/crews/1234/invites/5678/revoke';
    expect(redactInviteTokens(url)).toBe(url);
  });
});

describe('beforeBreadcrumb', () => {
  it('redacts the token from the message and the data bag', () => {
    const result = beforeBreadcrumb({
      message: `GET /v1/crew-invites/${TOKEN}`,
      data: { url: `/crew/join/${TOKEN}`, status_code: 200 },
    });
    expect(result.message).toBe('GET /v1/crew-invites/[redacted]');
    expect(result.data).toEqual({
      url: '/crew/join/[redacted]',
      status_code: 200,
    });
  });
});

describe('beforeSend', () => {
  it('redacts the token from the request URL and the transaction name', () => {
    const result = beforeSend({
      request: { url: `https://app.example.com/crew/join/${TOKEN}` },
      transaction: `/crew/join/${TOKEN}`,
    });
    expect(result.request?.url).toBe(
      'https://app.example.com/crew/join/[redacted]',
    );
    expect(result.transaction).toBe('/crew/join/[redacted]');
  });

  it('redacts the token from the Next.js request context', () => {
    const result = beforeSend({
      contexts: {
        nextjs: {
          request_path: `/crew/join/${TOKEN}`,
          router_kind: 'App Router',
        },
      },
    });
    expect(result.contexts?.['nextjs']).toEqual({
      request_path: '/crew/join/[redacted]',
      router_kind: 'App Router',
    });
  });
});

// The probe page throws on purpose (lib/definitions/probe-throw.ts); its events
// are tagged so triage skips them.
describe('beforeSend probe tag', () => {
  const tagged = { probe: 'global-error' };
  type EventShape = {
    request?: { url?: string };
    transaction?: string;
    contexts?: Record<string, Record<string, unknown> | undefined>;
    tags?: Record<string, unknown>;
  };
  const send = (event: EventShape) => beforeSend(event);

  it.each([
    [
      'the browser URL',
      { request: { url: 'https://staging.example.com/probe-throw?x=1' } },
    ],
    ['the transaction', { transaction: '/probe-throw' }],
    ['a server transaction name', { transaction: 'GET /probe-throw' }],
    [
      'the server request path',
      { contexts: { nextjs: { request_path: '/probe-throw/' } } },
    ],
  ])('tags an event from the probe page by %s', (_label, event) => {
    expect(send(event).tags).toEqual(tagged);
  });

  it('keeps tags the event already had', () => {
    const result = send({
      transaction: '/probe-throw',
      tags: { tier: 'free' },
    });
    expect(result.tags).toEqual({ tier: 'free', ...tagged });
  });

  it.each(['/probe-throwing', '/bot', '/events/probe-throw', 'GET /bot'])(
    'leaves %s untagged',
    (path) => {
      expect(send({ transaction: path }).tags).toBeUndefined();
    },
  );
});
