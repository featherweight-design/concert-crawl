-- Rename the new-show notification category now that fan-out covers manual
-- follows, not just Spotify-sourced ones. `category` is a text column, so this
-- is a data-only update with no type change.
--
-- Without it, historical rows keep the old value and render via
-- CATEGORY_FALLBACK: a neutral bell instead of their label and glyph. They do
-- not disappear — the client passes unknown categories through by design.
UPDATE notifications
SET category = 'artist.new_show'
WHERE category = 'spotify.new_show';
