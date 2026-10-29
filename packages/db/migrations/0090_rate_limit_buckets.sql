-- Durable rate-limit counters (#528), replacing the API's process-local Map so
-- limits hold across instances and restarts. One row per limiter key; the API
-- upserts it atomically per hit and prunes rows whose reset_at has passed.
-- Expand-only: a new table, nothing existing changes.
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_buckets_reset_at_idx" ON "rate_limit_buckets" USING btree ("reset_at");
