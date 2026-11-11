-- B+ B15: the avatar pair. "Mix two" stores a second colour beside the first.
--
-- Expand-only: a nullable column on the existing avatar_color enum. NULL (every
-- existing profile, and anyone who keeps it solid) means a solid avatar.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "avatar_second_color" "avatar_color";
