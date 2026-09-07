-- Back-fill the visibility switch for rows a human already ruled not-an-artist.
--
-- `not_an_artist` (0083) and `hidden` (#1342) record the same fact — there is no
-- act here — but only `hidden` is read by the public surfaces. Every row ruled
-- before the admin PATCH started deriving the switch therefore still carries a
-- follow button, a slot on the event bill and its own artist page.
--
-- Idempotent, and it never un-hides: rows already hidden are untouched, and a
-- row hidden for some other reason keeps its state.
--
-- The comparison casts to text rather than using the enum literal. On a fresh
-- database every migration runs in one transaction, and Postgres refuses to
-- read an enum value added by an earlier statement in that same transaction
-- (55P04, "unsafe use of new value") — which 0083 is.
UPDATE artists
SET hidden = true, updated_at = now()
WHERE match_status::text = 'not_an_artist'
  AND hidden = false;
