-- Durable rate-limit counters (#528), replacing the API's process-local Map so
-- limits hold across instances and restarts. One row per limiter key; the API
-- upserts it atomically per hit and prunes rows whose reset_at has passed.
-- `user_id` carries the Clerk ID of a user-scoped limiter so account deletion
-- can remove that user's buckets.
-- Expand-only: a new table, nothing existing changes.
CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_buckets_reset_at_idx" ON "rate_limit_buckets" USING btree ("reset_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_buckets_user_id_idx" ON "rate_limit_buckets" USING btree ("user_id");
