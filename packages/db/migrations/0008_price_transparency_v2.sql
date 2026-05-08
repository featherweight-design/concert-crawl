CREATE TYPE "public"."submission_tier" AS ENUM('GA', 'Reserved', 'VIP', 'Pit', 'Lawn');--> statement-breakpoint
CREATE TYPE "public"."submission_vendor" AS ENUM('AXS', 'Ticketmaster', 'SeatGeek', 'DICE', 'Eventbrite', 'VenueBoxOffice');--> statement-breakpoint
CREATE TYPE "public"."submission_how_found" AS ENUM('bought_myself', 'saw_listing', 'at_the_venue');--> statement-breakpoint
ALTER TABLE "price_submissions" DROP COLUMN IF EXISTS "tier_label";--> statement-breakpoint
ALTER TABLE "price_submissions" DROP COLUMN IF EXISTS "source_note";--> statement-breakpoint
ALTER TABLE "price_submissions" ADD COLUMN "tier" "submission_tier" NOT NULL DEFAULT 'GA';--> statement-breakpoint
ALTER TABLE "price_submissions" ADD COLUMN "vendor" "submission_vendor" NOT NULL DEFAULT 'Ticketmaster';--> statement-breakpoint
ALTER TABLE "price_submissions" ADD COLUMN "how_found" "submission_how_found" NOT NULL DEFAULT 'bought_myself';--> statement-breakpoint
ALTER TABLE "price_submissions" ADD COLUMN "disputed_submission_id" uuid;--> statement-breakpoint
ALTER TABLE "price_submissions" ALTER COLUMN "tier" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "price_submissions" ALTER COLUMN "vendor" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "price_submissions" ALTER COLUMN "how_found" DROP DEFAULT;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "price_submissions" ADD CONSTRAINT "price_submissions_disputed_submission_id_price_submissions_id_fk" FOREIGN KEY ("disputed_submission_id") REFERENCES "public"."price_submissions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submission_confirms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_confirms_submission_user_uniq" UNIQUE("submission_id","user_id")
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submission_confirms" ADD CONSTRAINT "submission_confirms_submission_id_price_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."price_submissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
