-- #737 in-app notification surface — expand-only.
--
-- 1. `user_profiles.notifications_seen_at`: the panel-open watermark. Nullable
--    with no default and no backfill; NULL means "never opened the panel".
-- 2. A partial covering index for the consumer list query, whose hot path is
--    exactly (user_id, created_at DESC, id DESC) filtered to `user_notification`.
-- 3. A second partial index for the daily retention prune. The prune filters on
--    (type, created_at) across *all* users, so the user_id-leading index above
--    cannot serve it — without this it degrades to a full scan of the one table
--    in this product whose growth is multiplied by watcher-audience size.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "notifications_seen_at" timestamptz;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_created_idx" ON "notifications" ("user_id", "created_at" DESC, "id" DESC) WHERE "type" = 'user_notification';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at") WHERE "type" = 'user_notification';
