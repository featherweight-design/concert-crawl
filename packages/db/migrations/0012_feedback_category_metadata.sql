-- Recreate feedback_category enum with correct values.
-- Safe: no feedback rows exist (POST /v1/feedback never shipped).
ALTER TABLE "feedback" ALTER COLUMN "category" TYPE text;--> statement-breakpoint
DROP TYPE "feedback_category";--> statement-breakpoint
CREATE TYPE "feedback_category" AS ENUM('bug', 'idea', 'praise', 'other');--> statement-breakpoint
ALTER TABLE "feedback" ALTER COLUMN "category" TYPE "feedback_category" USING "category"::"feedback_category";--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "metadata" jsonb;
