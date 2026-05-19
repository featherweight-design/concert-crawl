ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "capacity" integer;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "venue_type" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "about" text;
