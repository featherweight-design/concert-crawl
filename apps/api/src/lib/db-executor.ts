// apps/api/src/lib/db-executor.ts
//
// Query executor accepted by persistence helpers that may run inside a
// caller's transaction: either the shared Drizzle client or a transaction
// handle.

import type { Database } from '@concert-crawl/db';

export type DbTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];

export type DbExecutor = Database | DbTransaction;
