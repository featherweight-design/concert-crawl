CREATE TYPE "public"."price_source" AS ENUM('structured_data', 'ticketmaster', 'eventbrite', 'dice', 'songkick', 'bandsintown', 'seatgeek', 'community');--> statement-breakpoint
CREATE TYPE "public"."price_retrieval_outcome" AS ENUM('hit', 'miss', 'error');--> statement-breakpoint
CREATE TYPE "public"."price_submission_status" AS ENUM('pending', 'corroborated', 'disputed', 'stale');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_retrieval_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"source" text NOT NULL,
	"outcome" "price_retrieval_outcome" NOT NULL,
	"latency_ms" integer NOT NULL,
	"error_message" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "price_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"price_min" numeric(10, 2) NOT NULL,
	"price_max" numeric(10, 2),
	"tier_label" text,
	"source_note" text,
	"status" "price_submission_status" DEFAULT 'pending' NOT NULL,
	"corroboration_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "price_source" "price_source";--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN "price_url" text;--> statement-breakpoint
ALTER TABLE "user_roles" ADD COLUMN "price_cred_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_retrieval_log" ADD CONSTRAINT "price_retrieval_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_retrieval_log" ADD CONSTRAINT "price_retrieval_log_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_submissions" ADD CONSTRAINT "price_submissions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_log_venue_source_attempted_at_idx" ON "price_retrieval_log" USING btree ("venue_id","source","attempted_at");