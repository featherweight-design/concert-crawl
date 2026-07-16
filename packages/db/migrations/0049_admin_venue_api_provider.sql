-- Admin Venue API provider fields (#506) — API-backed venue crawling support.
-- Expand-only: two nullable columns on venues, no backfill. When api_provider
-- is set, the crawler (per #505) bypasses the HTML → JSON-LD → LLM cascade and
-- pulls events directly from the third-party API. First provider: VenuePilot.

CREATE TYPE "api_provider" AS ENUM ('venuepilot');
--> statement-breakpoint

ALTER TABLE "venues" ADD COLUMN "api_provider" "api_provider";
--> statement-breakpoint

ALTER TABLE "venues" ADD COLUMN "api_account_id" text;
