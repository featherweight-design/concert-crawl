-- Admin redesign 2a: what the Needs you queue is told to leave alone.
--
-- Expand-only: a new table. A row with item_key is a snooze until `until`; a
-- row with not_useful hides one kind of item for one venue.
CREATE TABLE IF NOT EXISTS "admin_queue_snoozes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "item_key" text,
  "kind" text NOT NULL,
  "venue_id" uuid REFERENCES "venues"("id") ON DELETE CASCADE,
  "until" timestamp with time zone,
  "not_useful" boolean DEFAULT false NOT NULL,
  "reason" text,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admin_queue_snoozes_item_key_idx" ON "admin_queue_snoozes" ("item_key") WHERE "item_key" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "admin_queue_snoozes_not_useful_idx" ON "admin_queue_snoozes" ("kind", "venue_id") WHERE "not_useful";
