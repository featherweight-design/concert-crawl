-- Spotify Sync schema expansion (#763 PR 1) — eng spec §4.
-- Expand-only: 2 new enums, 3 new tables, additive nullable/defaulted
-- columns on events / user_artist_follows / user_profiles. No drops, no
-- type changes.
--
--   1. user_spotify_connections — one row per user with a linked Spotify
--      account (disconnect DELETEs; external revocation keeps the row with
--      status='revoked' so the UI can prompt a reconnect).
--   2. push_subscriptions — Web Push endpoints, soft-disabled on 404/410.
--   3. spotify_alert_log — (user, event, kind) idempotency ledger for
--      fan-out; retries never double-send.
--   4. user_artist_follows gains source/canonical_name/rank/last_synced_at
--      plus the replace-set-per-source upsert index.
--   5. events gains canonical_supporting text[] + GIN index (equality-match
--      surface for follow highlighting).
--   6. user_profiles gains spotify_nudge_seen_at.
--
-- canonical_name / canonical_supporting are backfilled by the JS scripts in
-- scripts/2026-07-18-*-backfill.ts — canonicalization lives ONLY in JS
-- (canonicalizeArtist), never re-implemented in SQL.

CREATE TYPE "spotify_connection_status" AS ENUM (
  'connected',
  'error',
  'revoked'
);
--> statement-breakpoint

CREATE TYPE "artist_follow_source" AS ENUM (
  'manual',
  'spotify_followed',
  'spotify_top'
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "user_spotify_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "spotify_user_id" text NOT NULL,
  "display_name" text,
  "status" "spotify_connection_status" DEFAULT 'connected' NOT NULL,
  "auto_watch" boolean DEFAULT false NOT NULL,
  "digest_enabled" boolean DEFAULT true NOT NULL,
  "push_enabled" boolean DEFAULT true NOT NULL,
  "connected_at" timestamptz DEFAULT now() NOT NULL,
  "last_synced_at" timestamptz,
  "last_sync_error" text,
  "artist_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "user_spotify_connections_user_id_idx"
  ON "user_spotify_connections" ("user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "user_agent" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "last_used_at" timestamptz,
  "disabled_at" timestamptz
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_idx"
  ON "push_subscriptions" ("endpoint");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_idx"
  ON "push_subscriptions" ("user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "spotify_alert_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "event_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "spotify_alert_log_event_id_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE cascade
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "spotify_alert_log_user_event_kind_idx"
  ON "spotify_alert_log" ("user_id", "event_id", "kind");
--> statement-breakpoint

ALTER TABLE "user_artist_follows"
  ADD COLUMN "source" "artist_follow_source" DEFAULT 'manual' NOT NULL;
--> statement-breakpoint

ALTER TABLE "user_artist_follows"
  ADD COLUMN "canonical_name" text DEFAULT '' NOT NULL;
--> statement-breakpoint

ALTER TABLE "user_artist_follows"
  ADD COLUMN "rank" integer;
--> statement-breakpoint

ALTER TABLE "user_artist_follows"
  ADD COLUMN "last_synced_at" timestamptz;
--> statement-breakpoint

-- Replace-set-per-source upsert target. NULL spotify_artist_id rows (manual
-- follows) are all distinct under Postgres NULL semantics — intended; manual
-- duplicates are guarded at the API layer.
CREATE UNIQUE INDEX IF NOT EXISTS "user_artist_follows_user_source_artist_idx"
  ON "user_artist_follows" ("user_id", "source", "spotify_artist_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "user_artist_follows_canonical_name_idx"
  ON "user_artist_follows" ("canonical_name");
--> statement-breakpoint

ALTER TABLE "events"
  ADD COLUMN "canonical_supporting" text[];
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "events_canonical_supporting_idx"
  ON "events" USING gin ("canonical_supporting");
--> statement-breakpoint

ALTER TABLE "user_profiles"
  ADD COLUMN "spotify_nudge_seen_at" timestamptz;
