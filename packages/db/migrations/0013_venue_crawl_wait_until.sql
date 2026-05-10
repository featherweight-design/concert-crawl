CREATE TYPE "crawl_wait_until" AS ENUM('networkidle', 'load', 'domcontentloaded');--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "crawl_wait_until" "crawl_wait_until" NOT NULL DEFAULT 'networkidle';--> statement-breakpoint
UPDATE "venues" SET "crawl_wait_until" = 'load' WHERE "slug" = 'bluebird-theater';
