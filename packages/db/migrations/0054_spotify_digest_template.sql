-- #763 Spotify sync PR 4: seed the weekly digest template into the email kill
-- switch table (enabled by default, matching every other template key).
INSERT INTO email_template_config (template_key, enabled)
VALUES ('spotify_digest', true)
ON CONFLICT (template_key) DO NOTHING;
