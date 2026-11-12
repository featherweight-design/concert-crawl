// apps/api/src/test/helpers/pending-counter-index.ts
//
// Several fans can each have an update pending on one price (B+ B9), but
// only once the 0100 contract migration drops 0041's one-pending-counter-per-
// parent index. Until then the test database still has that index, so the
// suites that exercise several pending updates on one price call this in
// their `describe` to drop it for the suite and put it back afterwards.
//
// Integration files run one at a time (vitest.integration.ts:
// fileParallelism false, singleFork), so no other suite sees the gap. It only
// restores the index if it found it, so once 0100 has run this is a no-op;
// delete the helper and its callers in the 0100 PR.
import { afterAll, beforeAll } from 'vitest';
import { sql } from 'drizzle-orm';
import { testDb } from './db.js';
import { clearTables } from './seed.js';

const OLD_INDEX = 'price_submissions_pending_counter_unique_idx';

export function allowSeveralPendingCountersPerPrice(): void {
  let hadIndex = false;

  beforeAll(async () => {
    const rows = await testDb.execute<{ indexname: string }>(
      sql`SELECT indexname FROM pg_indexes WHERE indexname = ${OLD_INDEX}`,
    );
    hadIndex = rows.length > 0;
    if (hadIndex) {
      await testDb.execute(
        sql`DROP INDEX IF EXISTS price_submissions_pending_counter_unique_idx`,
      );
    }
  });

  afterAll(async () => {
    if (!hadIndex) return;
    // A suite may leave two pending counters on one price behind; the
    // index can't be rebuilt over them.
    await clearTables();
    await testDb.execute(
      sql`CREATE UNIQUE INDEX IF NOT EXISTS price_submissions_pending_counter_unique_idx
            ON price_submissions (disputed_submission_id)
            WHERE status = 'pending' AND disputed_submission_id IS NOT NULL`,
    );
  });
}
