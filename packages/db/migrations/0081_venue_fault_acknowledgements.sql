-- Acknowledgements for admin triage faults an operator has judged expected and
-- unfixable — Summit's permanent Live Nation list cap (#1127), a seasonal
-- outdoor venue whose calendar genuinely ends in November.
--
-- These are NOT dismissals. `evidence_value` stores the figure the operator was
-- looking at, and the matcher in
-- packages/crawler-core/src/lib/triage-conditions.ts re-fires the fault as soon
-- as that figure moves. A plain dismissal would hide the one change worth
-- seeing.
--
-- Expand-only: CREATE TABLE and nothing else. Nothing reads this table until
-- the triage endpoint learns to partition on it, so applying this migration is
-- a no-op for every existing surface.
--
-- `evidence_value` is nullable on purpose: a blocked venue that never returned
-- an HTTP status has no figure to acknowledge. A sentinel string was rejected
-- because every candidate collides with a value some condition can legitimately
-- produce.
CREATE TABLE "venue_fault_acknowledgements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"condition" text NOT NULL,
	"evidence_kind" text,
	"evidence_value" text,
	"reason" text NOT NULL,
	"acknowledged_by" text NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venue_fault_acknowledgements_venue_condition_uniq" UNIQUE("venue_id","condition")
);
--> statement-breakpoint
ALTER TABLE "venue_fault_acknowledgements" ADD CONSTRAINT "venue_fault_acknowledgements_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;
