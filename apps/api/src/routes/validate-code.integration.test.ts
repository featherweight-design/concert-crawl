// Integration tests for the brute-force guard on POST /v1/auth/validate-code.
//
// The guard counts misses only, so a poster code shared behind one IP never
// spends that network's budget. What this file proves is what the limiter's
// Postgres bucket did: a valid code refunds its count, the miss after the
// limit is refused, and a concurrent burst cannot run more lookups than the
// limit allows.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { inviteCodes } from '@concert-crawl/db';
import { createApp } from '../app.js';
import { testDb } from '../test/helpers/db.js';
import { clearTables } from '../test/helpers/seed.js';

const app = createApp();
const VALID = 'BETA-AAAA-0001';

const validate = (code: string, ip = '203.0.113.7'): Promise<Response> =>
  app.request('/v1/auth/validate-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ code }),
  });

/** A well-formed code that does not exist. */
const miss = (n: number): string =>
  `BETA-FFFF-${n.toString(16).toUpperCase().padStart(4, '0')}`;

describe('POST /v1/auth/validate-code rate limit', () => {
  beforeEach(async () => {
    await clearTables();
    await testDb
      .insert(inviteCodes)
      .values({ code: VALID, createdBy: 'user_admin', maxUses: 50 });
  });

  it('never spends the budget on a valid code', async () => {
    for (let i = 0; i < 30; i += 1) {
      expect((await validate(VALID)).status).toBe(200);
    }
    expect((await validate(miss(1))).status).toBe(404);
  });

  it('still admits a valid code after ten misses, and refuses the eleventh miss', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await validate(miss(i))).status).toBe(404);
    }
    expect((await validate(VALID)).status).toBe(200);
    expect((await validate(miss(10))).status).toBe(429);
    // Over the limit, even a valid code is refused until the window closes,
    // or the eleventh guess would be an oracle with no end.
    expect((await validate(VALID)).status).toBe(429);
  });

  it('never counts a real code that is full or expired as a miss', async () => {
    await testDb.insert(inviteCodes).values([
      {
        code: 'BETA-AAAA-0002',
        createdBy: 'user_admin',
        usedBy: 'user_x',
        usedAt: new Date(),
        useCount: 1,
      },
      {
        code: 'BETA-AAAA-0003',
        createdBy: 'user_admin',
        expiresAt: new Date(Date.now() - 60_000),
      },
    ]);
    for (let i = 0; i < 15; i += 1) {
      expect((await validate('BETA-AAAA-0002')).status).toBe(409);
      expect((await validate('BETA-AAAA-0003')).status).toBe(410);
    }
    expect((await validate(miss(1))).status).toBe(404);
  });

  it('tells a miss refused in the extra slot to wait out the window', async () => {
    for (let i = 0; i < 10; i += 1) await validate(miss(i));
    const res = await validate(miss(10));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBe(3600);
  });

  it('keeps one IP from spending another IP budget', async () => {
    for (let i = 0; i < 11; i += 1) await validate(miss(i), '198.51.100.1');
    expect((await validate(miss(99), '198.51.100.2')).status).toBe(404);
  });

  it('answers at most ten misses from a concurrent burst', async () => {
    const statuses = await Promise.all(
      Array.from({ length: 25 }, (_, i) => validate(miss(i))),
    ).then((responses) => responses.map((res) => res.status));

    expect(statuses.filter((status) => status === 404)).toHaveLength(10);
    expect(statuses.filter((status) => status === 429)).toHaveLength(15);
  });
});

// The web server action calls this route from the web function, so every
// visitor arrives from the web project's IP. It forwards the visitor's own
// address as x-client-ip, vouched for by the service key.
describe('POST /v1/auth/validate-code — forwarded visitor IP', () => {
  const SERVICE_KEY = 'test-internal-secret';
  const WEB_FUNCTION_IP = '192.0.2.50';

  const fromWeb = (
    code: string,
    visitorIp: string,
    serviceKey?: string,
  ): Promise<Response> =>
    app.request('/v1/auth/validate-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': WEB_FUNCTION_IP,
        'x-client-ip': visitorIp,
        ...(serviceKey ? { 'x-service-key': serviceKey } : {}),
      },
      body: JSON.stringify({ code }),
    });

  beforeEach(async () => {
    vi.stubEnv('INTERNAL_API_SECRET', SERVICE_KEY);
    await clearTables();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('gives two visitors behind the web function separate buckets', async () => {
    for (let i = 0; i < 11; i += 1) {
      await fromWeb(miss(i), '198.51.100.1', SERVICE_KEY);
    }
    expect((await fromWeb(miss(50), '198.51.100.1', SERVICE_KEY)).status).toBe(
      429,
    );
    expect((await fromWeb(miss(51), '198.51.100.2', SERVICE_KEY)).status).toBe(
      404,
    );
  });

  it('ignores x-client-ip sent without the service key', async () => {
    // Each request names a fresh visitor IP, but without the key they all
    // land in the web function's one bucket.
    for (let i = 0; i < 11; i += 1) {
      await fromWeb(miss(i), `198.51.100.${i + 10}`);
    }
    expect((await fromWeb(miss(60), '198.51.100.99')).status).toBe(429);
    expect((await validate(miss(61), WEB_FUNCTION_IP)).status).toBe(429);
  });
});

describe('POST /v1/auth/validate-code — custom codes (admin 5b)', () => {
  beforeEach(async () => {
    await clearTables();
    await testDb.insert(inviteCodes).values([
      { code: VALID, createdBy: 'user_admin', maxUses: 50 },
      { code: 'REDROCKS', createdBy: 'user_admin', maxUses: 50 },
    ]);
  });

  it('accepts a custom code in any case', async () => {
    expect((await validate('REDROCKS', '203.0.113.20')).status).toBe(200);
    expect((await validate('redrocks', '203.0.113.20')).status).toBe(200);
  });

  it('still accepts a generated code, in any case', async () => {
    expect((await validate(VALID, '203.0.113.21')).status).toBe(200);
    expect((await validate(VALID.toLowerCase(), '203.0.113.21')).status).toBe(
      200,
    );
  });

  it('answers an unknown custom code as not found', async () => {
    expect((await validate('NOSUCHCODE', '203.0.113.22')).status).toBe(404);
  });
});
