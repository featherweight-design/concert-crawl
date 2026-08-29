ALTER TABLE "price_submissions"
  ADD COLUMN "last_seen_at" timestamp with time zone,
  ADD COLUMN "last_seen_by" text;
