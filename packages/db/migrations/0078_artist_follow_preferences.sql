-- Native artist following — artist alert preferences move onto a table every
-- user can have. Expand only.
--
-- Today the three artist-alert settings live on `user_spotify_connections`,
-- which a user only has if they connected Spotify. Spotify is capped at 5
-- authenticated accounts, so following has to mean something for a user who
-- has never touched it — that requires the preferences to live on
-- `user_notification_preferences` instead.
--
-- The defaults are deliberately asymmetric and mirror the COALESCE the crawl
-- fan-out already encodes: following is the opt-in, so alerts default ON;
-- following must never silently mutate Watching, so auto-watch defaults OFF.
-- Do not tidy them into a matching pair.
ALTER TABLE user_notification_preferences
  ADD COLUMN artist_alerts_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN artist_auto_watch     boolean NOT NULL DEFAULT false,
  ADD COLUMN weekly_digest_enabled boolean NOT NULL DEFAULT true;
--> statement-breakpoint
-- Backfill by INSERT, never UPDATE ... FROM.
--
-- `user_notification_preferences` rows are created LAZILY on first PATCH of
-- /v1/me/notification-preferences. A Spotify-connected user who has never
-- opened the notifications screen therefore has settings on their connection
-- row and no preferences row at all — an UPDATE matches nothing for them and
-- silently discards what they chose.
--
-- `master_enabled` is deliberately absent from the column list. Inserted rows
-- take the table default (false), preserving today's behaviour exactly:
-- sendPushForNotification already gates on it, and inventing `true` here would
-- start pushing to users who never enabled a device.
--
-- `user_spotify_connections.{auto_watch, push_enabled, digest_enabled}` are NOT
-- dropped. This is the expand phase; the connections panel stops writing them
-- later, and a contract migration removes them after one clean weekly digest
-- cycle.
INSERT INTO user_notification_preferences
  (user_id, artist_alerts_enabled, artist_auto_watch, weekly_digest_enabled)
SELECT user_id, push_enabled, auto_watch, digest_enabled
FROM user_spotify_connections
WHERE status <> 'revoked'
ON CONFLICT (user_id) DO UPDATE SET
  artist_alerts_enabled = EXCLUDED.artist_alerts_enabled,
  artist_auto_watch     = EXCLUDED.artist_auto_watch,
  weekly_digest_enabled = EXCLUDED.weekly_digest_enabled;
