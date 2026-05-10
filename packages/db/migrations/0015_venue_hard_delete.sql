-- Make events.venue_id nullable and switch from CASCADE to SET NULL
-- so events remain published when a venue is hard-deleted
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_venue_id_venues_id_fk";
ALTER TABLE "events" ALTER COLUMN "venue_id" DROP NOT NULL;
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk"
  FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
