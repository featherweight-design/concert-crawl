// Integration tests for the brute-force guard on POST /v1/auth/validate-code.
//
// The guard counts misses only, so a poster code shared behind one IP never
// spends that network's budget. What this file proves is what the limiter's
// Postgres bucket did: a valid code refunds its count, the miss after the
// limit is refused, and a concurrent burst cannot run more lookups than the
// limit allows.
import { describe, it, expect, beforeEach } from 'vitest';
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
