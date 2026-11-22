-- The feature-flag contract step, first half (P47-17 contract).
--
-- 1. The `spotify-sync` flag is retired: nothing reads it since the Spotify
--    sync came out (lane 47 digest PR 3, #766). Its row goes, and with it, by
--    the ON DELETE CASCADE that 0122 set, its named people and its history.
--    The flag loaders already skip keys that left the registry, so the API
--    still serving during the deploy ignores the row either way.
--
-- 2. `feature_flags.enabled` loses NOT NULL. This release removes every reader
--    and writer of it (the ladder's `stage` is the only state now), so new
--    rows leave it NULL. It is not dropped here because both deploy workflows
--    migrate before they ship code: the API still serving between the two
--    steps, and any code rollback, still reads and writes `enabled`. Both
--    tolerate a nullable column (the old reader falls back to the registry
--    default on NULL). 0126 drops the column once this release is in
--    production.
--
-- Down:
--   UPDATE feature_flags SET enabled = (stage = 'everyone') WHERE enabled IS NULL;
--   ALTER TABLE feature_flags ALTER COLUMN enabled SET NOT NULL;
--   The deleted spotify-sync row is not restored; its registry default (off)
--   is what an old release reads without it.

DELETE FROM "feature_flags" WHERE "key" = 'spotify-sync';--> statement-breakpoint
ALTER TABLE "feature_flags" ALTER COLUMN "enabled" DROP NOT NULL;
