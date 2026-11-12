-- Admin redesign 2a': hold a price that would promote until an admin approves.
--
-- Expand-only: one nullable column. While admin_settings.approve_prices_myself
-- is on, a confirm that would promote a submission sets held_for_admin_at
-- instead, and the row stays pending. NULL everywhere today, so nothing reads
-- or writes it until the setting is turned on.
--
-- Down: ALTER TABLE price_submissions DROP COLUMN IF EXISTS held_for_admin_at;
ALTER TABLE "price_submissions"
  ADD COLUMN IF NOT EXISTS "held_for_admin_at" timestamp with time zone;
