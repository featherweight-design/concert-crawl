ALTER TABLE "crawl_runs" ADD COLUMN "page_hash" text;--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN IF EXISTS "raw_html";