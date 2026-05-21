CREATE TYPE "public"."feedback_status" AS ENUM('unread', 'read', 'flagged', 'issue_opened', 'resolved', 'archived');--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "status" "feedback_status" DEFAULT 'unread' NOT NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN "issue_url" text;
