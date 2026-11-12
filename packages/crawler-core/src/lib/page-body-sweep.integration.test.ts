import { describe, it, expect, beforeEach } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { db, crawlRunPages, crawlRuns, venues } from '@concert-crawl/db';
import { sweepExpiredPageBodies } from './page-body-sweep.js';

const NOW = new Date('2026-11-12T12:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

async function seedRun(): Promise<string> {
  const [venue] = await db
    .insert(venues)
    .values({
      name: 'Bluebird Theater',
      slug: 'bluebird-theater',
      websiteUrl: 'https://bluebird.example',
    })
    .returning({ id: venues.id });
  if (!venue) throw new Error('venue insert returned no row');
  const [run] = await db
    .insert(crawlRuns)
    .values({ venueId: venue.id, status: 'success' })
    .returning({ id: crawlRuns.id });
  if (!run) throw new Error('run insert returned no row');
  return run.id;
}

const page = (
  crawlRunId: string,
  url: string,
  expiresInDays: number | null,
  body: string | null,
) => ({
  crawlRunId,
  url,
  fetchMode: 'http',
  htmlGz: body === null ? null : Buffer.from(body),
  bodyExpiresAt:
    expiresInDays === null
      ? null
      : new Date(NOW.getTime() + expiresInDays * DAY_MS),
});

describe('sweepExpiredPageBodies', () => {
  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE crawl_run_pages, crawl_runs, venues RESTART IDENTITY CASCADE`,
    );
  });

  it('nulls the body of an expired page and keeps the row, leaving live bodies alone', async () => {
    const runId = await seedRun();
    await db
      .insert(crawlRunPages)
      .values([
        page(runId, 'https://v.example/expired', -1, 'old'),
        page(runId, 'https://v.example/due-now', 0, 'edge'),
        page(runId, 'https://v.example/live', 3, 'fresh'),
        page(runId, 'https://v.example/no-body', -5, null),
        page(runId, 'https://v.example/no-expiry', null, 'metadata-only'),
      ]);

    const result = await sweepExpiredPageBodies(NOW);

    expect(result.expired).toBe(2);
    expect(result.remainingBodies).toBe(2);
    expect(result.remainingBytes).toBe(
      Buffer.byteLength('fresh') + Buffer.byteLength('metadata-only'),
    );
    const rows = await db.select().from(crawlRunPages);
    expect(rows).toHaveLength(5);
    const byUrl = new Map(rows.map((row) => [row.url, row]));
    expect(byUrl.get('https://v.example/expired')?.htmlGz).toBeNull();
    expect(byUrl.get('https://v.example/due-now')?.htmlGz).toBeNull();
    expect(byUrl.get('https://v.example/live')?.htmlGz?.toString()).toBe(
      'fresh',
    );
  });

  it('is idempotent and a no-op when nothing has ever been stored', async () => {
    expect(await sweepExpiredPageBodies(NOW)).toEqual({
      expired: 0,
      remainingBodies: 0,
      remainingBytes: 0,
    });
    const runId = await seedRun();
    await db
      .insert(crawlRunPages)
      .values(page(runId, 'https://v.example/a', -1, 'x'));
    await sweepExpiredPageBodies(NOW);
    expect((await sweepExpiredPageBodies(NOW)).expired).toBe(0);
    const [row] = await db
      .select({ url: crawlRunPages.url })
      .from(crawlRunPages)
      .where(eq(crawlRunPages.url, 'https://v.example/a'));
    expect(row?.url).toBe('https://v.example/a');
  });
});
