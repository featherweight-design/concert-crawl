// apps/api/src/lib/db-executor.ts
//
// Query executor accepted by billing/webhook persistence helpers: either the
// shared Drizzle client or a transaction handle. The webhook route runs each
// event's idempotency insert + handler writes in ONE transaction so a handler
// failure rolls back the processed_stripe_events row and Stripe's retry
// re-processes the event.

import type { Database } from '@concert-crawl/db'

export type DbTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0]

export type DbExecutor = Database | DbTransaction
