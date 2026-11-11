-- B+ A3: a "Tickets available" report, and the confirm method stored.
--
-- Expand-only. The status check widens to admit 'available' (a fan report
-- that clears a promoted sold-out at the same confirm threshold); every
-- existing row already satisfies it. The confirm method is a new nullable
-- column: confirms filed before this migration, and any client that does not
-- send one, keep NULL.
ALTER TABLE "event_reports" DROP CONSTRAINT IF EXISTS "event_reports_status_check";
--> statement-breakpoint
ALTER TABLE "event_reports" ADD CONSTRAINT "event_reports_status_check"
  CHECK ("status" IN ('sold-out', 'cancelled', 'postponed', 'available'));
--> statement-breakpoint
ALTER TABLE "event_report_confirms" ADD COLUMN IF NOT EXISTS "method" text;
--> statement-breakpoint
ALTER TABLE "event_report_confirms" DROP CONSTRAINT IF EXISTS "event_report_confirms_method_check";
--> statement-breakpoint
ALTER TABLE "event_report_confirms" ADD CONSTRAINT "event_report_confirms_method_check"
  CHECK ("method" IN ('saw_same_source', 'own_evidence', 'heard_from_venue'));
