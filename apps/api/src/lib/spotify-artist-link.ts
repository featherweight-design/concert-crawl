// Spotify artist ids are 22 base-62 characters.
const ARTIST_ID = '[0-9A-Za-z]{22}';
const URI_RE = new RegExp(`^spotify:artist:(${ARTIST_ID})$`);
// `/artist/<id>`, or `/intl-xx/artist/<id>` as the mobile share sheet emits.
const PATH_RE = new RegExp(`^/(?:intl-[a-z]{2,4}/)?artist/(${ARTIST_ID})/?$`);

/**
 * The artist id inside a pasted Spotify link, or null for anything else.
 *
 * Accepts `https://open.spotify.com/artist/<id>` (with or without `?si=`) and
 * `spotify:artist:<id>`. Only the id is ever stored, so a pasted link can't
 * smuggle a different host, path or query into the database.
 */
export function parseSpotifyArtistLink(input: string): string | null {
  const text = input.trim();
  const uri = URI_RE.exec(text);
  if (uri) return uri[1] ?? null;

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') {
    return null;
  }
  return PATH_RE.exec(url.pathname)?.[1] ?? null;
}
