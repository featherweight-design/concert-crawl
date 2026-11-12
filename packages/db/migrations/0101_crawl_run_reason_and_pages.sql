-- Admin redesign 1a: why a run produced nothing, and which pages it fetched.
--
-- Expand-only: a new enum, a nullable column on crawl_runs (every existing row
-- stays NULL and reads "No reason recorded"), and a new table. Nothing is
-- dropped; crawl_runs.robots_txt_blocked stays until every reader uses reason.
DO $$ BEGIN
  CREATE TYPE "crawl_run_reason" AS ENUM (
    'page_unchanged',
    'crawl_paused',
    'robots_unreachable',
    'robots_disallowed',
    'robots_crawl_delay',
    'timeout',
    'blocked_http',
    'no_events_found',
    'calendar_not_found',
    'llm_account',
    'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "crawl_runs" ADD COLUMN IF NOT EXISTS "reason" "crawl_run_reason";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crawl_run_pages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "crawl_run_id" uuid NOT NULL REFERENCES "crawl_runs"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "final_url" text,
  "http_status" integer,
  "fetch_mode" text NOT NULL,
  "bytes" integer,
  "content_hash" text,
  "fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_run_pages_crawl_run_id_idx" ON "crawl_run_pages" ("crawl_run_id");
