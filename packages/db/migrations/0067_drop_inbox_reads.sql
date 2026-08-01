-- Contract half of PR #1269's expand: the admin inbox read-state tables are no
-- longer written or read by any code path. Unified triage read-state replaced
-- them, and #1269 removed the last consumer while deliberately leaving the
-- tables in place so the deploy was reversible. This drops them (#1270).
--
-- inbox_item_type is used by no other table, so it goes with them.
DROP TABLE IF EXISTS "inbox_read_watermarks";
--> statement-breakpoint
DROP TABLE IF EXISTS "inbox_reads";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."inbox_item_type";
