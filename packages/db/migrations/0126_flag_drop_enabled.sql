-- The feature-flag contract step, second half (P47-17 contract).
--
-- `feature_flags.enabled` goes. 0125 made it nullable and the release that
-- shipped with it removed every reader and writer; that release is now in
-- production, so no serving API and no code rollback within the window still
-- touches the column. The ladder's `stage` is the only flag state.
--
-- Down (restores the column, not its history):
--   ALTER TABLE feature_flags ADD COLUMN enabled boolean;
--   UPDATE feature_flags SET enabled = (stage = 'everyone');
--   A rollback past 0125's release also needs 0125's own down
--   (SET NOT NULL), which then holds since every row has a value.

ALTER TABLE "feature_flags" DROP COLUMN IF EXISTS "enabled";
