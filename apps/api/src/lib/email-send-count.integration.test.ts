import { beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import {
  claimEmailCapWarning,
  countEmailSend,
  emailDayKey,
  rateLimitBuckets,
  uncountEmailSend,
} from '@concert-crawl/db';
import { testDb } from '../test/helpers/db.js';
import { clearTables } from '../test/helpers/seed.js';

// The account-wide daily email count (packages/db/src/email-send-count.ts)
// against a real Postgres: the SQL the API and the crawler share.

const AT = new Date('2026-11-14T18:00:00Z');
const NEXT_DAY = new Date('2026-11-15T18:00:00Z');

const countOf = async (key: string): Promise<number | undefined> => {
  const [row] = await testDb
    .select({ count: rateLimitBuckets.count })
    .from(rateLimitBuckets)
    .where(eq(rateLimitBuckets.key, key));
  return row?.count;
};

const expire = async (key: string) => {
  await testDb
    .update(rateLimitBuckets)
    .set({ resetAt: sql`now() - interval '1 second'` })
    .where(eq(rateLimitBuckets.key, key));
};

beforeEach(async () => {
  await clearTables();
});

describe('daily email count', () => {
  it('keys the row by Mountain Time calendar day', () => {
    // 05:00Z on the 15th is still the 14th in Denver.
    expect(emailDayKey(new Date('2026-11-15T05:00:00Z'))).toBe(
      'email-day:2026-11-14',
    );
    expect(emailDayKey(NEXT_DAY)).toBe('email-day:2026-11-15');
  });

  // The reason this isn't the general limiter: its clamp at max + 1 would
  // erase alerts counted past the cap.
  it('counts past any cap, unclamped', async () => {
    for (let i = 1; i <= 40; i++) {
      expect(await countEmailSend(testDb, AT)).toBe(i);
    }
    expect(await countOf(emailDayKey(AT))).toBe(40);
  });

  it('starts a new day in a new row', async () => {
    await countEmailSend(testDb, AT);
    await countEmailSend(testDb, AT);
    expect(await countEmailSend(testDb, NEXT_DAY)).toBe(1);
    expect(await countOf(emailDayKey(AT))).toBe(2);
  });

  it('reopens an expired row at 1', async () => {
    await countEmailSend(testDb, AT);
    await countEmailSend(testDb, AT);
    await expire(emailDayKey(AT));
    expect(await countEmailSend(testDb, AT)).toBe(1);
  });

  it('takes one back from the day it was counted in', async () => {
    await countEmailSend(testDb, AT);
    await countEmailSend(testDb, AT);
    await uncountEmailSend(testDb, AT);
    expect(await countOf(emailDayKey(AT))).toBe(1);
    // Another day's row is left alone.
    await uncountEmailSend(testDb, NEXT_DAY);
    expect(await countOf(emailDayKey(AT))).toBe(1);
  });

  it('never takes a row below zero, or from an expired row', async () => {
    await countEmailSend(testDb, AT);
    await uncountEmailSend(testDb, AT);
    await uncountEmailSend(testDb, AT);
    expect(await countOf(emailDayKey(AT))).toBe(0);
    await countEmailSend(testDb, AT);
    await expire(emailDayKey(AT));
    await uncountEmailSend(testDb, AT);
    expect(await countOf(emailDayKey(AT))).toBe(1);
  });
});

describe('the 80% warning claim', () => {
  it('stays unclaimed under 80% of the cap', async () => {
    expect(await claimEmailCapWarning(testDb, 23, 30, AT)).toBe(false);
  });

  it('is claimed once per day, by the first count at or past 80%', async () => {
    expect(await claimEmailCapWarning(testDb, 24, 30, AT)).toBe(true);
    expect(await claimEmailCapWarning(testDb, 25, 30, AT)).toBe(false);
    expect(await claimEmailCapWarning(testDb, 31, 30, AT)).toBe(false);
    // The next day warns again.
    expect(await claimEmailCapWarning(testDb, 24, 30, NEXT_DAY)).toBe(true);
  });

  it('can be claimed again once its row has expired', async () => {
    expect(await claimEmailCapWarning(testDb, 24, 30, AT)).toBe(true);
    await expire('email-day-warned:2026-11-14');
    expect(await claimEmailCapWarning(testDb, 24, 30, AT)).toBe(true);
  });
});
