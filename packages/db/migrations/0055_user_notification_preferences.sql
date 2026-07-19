-- #971 Web push (Tier C) — per-user push preferences.
-- One row per user; created lazily on first PATCH from /v1/me/notification-preferences.
-- The send pipeline reads these before firing a push and skips categories the user
-- has disabled (the notification row is still written for the bell #737 — push is a
-- side channel that respects these toggles).

CREATE TABLE IF NOT EXISTS "user_notification_preferences" (
  "user_id" text PRIMARY KEY,
  "master_enabled" boolean DEFAULT false NOT NULL,
  "watch_updates_enabled" boolean DEFAULT true NOT NULL,
  "price_drops_enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
