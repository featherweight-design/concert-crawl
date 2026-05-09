ALTER TYPE "public"."user_event_status" ADD VALUE 'watching';--> statement-breakpoint
ALTER TABLE "user_events" ADD COLUMN "saved_price" numeric(10, 2);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_events_user_event_idx" ON "user_events" USING btree ("user_id","event_id");
