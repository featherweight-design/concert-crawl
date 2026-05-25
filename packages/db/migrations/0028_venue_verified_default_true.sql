ALTER TABLE "venues" ALTER COLUMN "verified" SET DEFAULT true;--> statement-breakpoint
UPDATE "venues" SET "verified" = true WHERE "verified" = false;
