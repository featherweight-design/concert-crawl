CREATE TYPE "public"."avatar_color" AS ENUM('signal', 'accent', 'success', 'warning');--> statement-breakpoint
CREATE TYPE "public"."user_theme" AS ENUM('electric', 'jade', 'light');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"handle" text,
	"city" text,
	"avatar_color" "avatar_color",
	"theme" "user_theme" DEFAULT 'electric' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "user_profiles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "price_submissions" ALTER COLUMN "user_id" DROP NOT NULL;