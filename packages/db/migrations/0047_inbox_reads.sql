-- Admin Inbox (#542) — read-state storage for the unified admin inbox.
-- Expand-only: purely additive. No changes to events / price_submissions /
-- venues / notifications (the four source surfaces).
--
-- Two tables back per-item read/unread state:
--   1. inbox_reads — per-OCCURRENCE read marks, keyed
--      (item_type, item_id, source_created_at). The occurrence timestamp is
--      part of the unique key so a re-blocked venue / re-unverified event
--      re-enters the inbox as a NEW unread item rather than staying read off
--      a stale mark.
--   2. inbox_read_watermarks — per-category "read up to" for O(1)
--      mark-all-read (one upsert per category instead of one row per item).

-- Enum for the four inbox categories.
CREATE TYPE "inbox_item_type" AS ENUM (
  'event_flag',
  'price_submission',
  'blocked_venue',
  'crawl_failure'
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inbox_reads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "item_type" "inbox_item_type" NOT NULL,
  "item_id" text NOT NULL,
  "source_created_at" timestamptz NOT NULL,
  "read_at" timestamptz DEFAULT now() NOT NULL,
  "read_by" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "inbox_reads_item_type_item_id_source_created_at_unique"
    UNIQUE ("item_type", "item_id", "source_created_at")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inbox_read_watermarks" (
  "item_type" "inbox_item_type" PRIMARY KEY NOT NULL,
  "read_up_to" timestamptz NOT NULL,
  "read_by" text NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
