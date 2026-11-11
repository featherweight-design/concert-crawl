import { describe, expect, it } from 'vitest';
import { parseSpotifyArtistLink } from './spotify-artist-link.js';

const ID = '4Z8W4fKeB5YxbusRsdQVPb';

describe('parseSpotifyArtistLink', () => {
  it.each([
    [`https://open.spotify.com/artist/${ID}`],
    [`https://open.spotify.com/artist/${ID}?si=abc123`],
    [`https://open.spotify.com/intl-de/artist/${ID}?si=abc123`],
    [`  https://open.spotify.com/artist/${ID}/  `],
    [`spotify:artist:${ID}`],
  ])('accepts %s', (link) => {
    expect(parseSpotifyArtistLink(link)).toBe(ID);
  });

  it.each([
    [''],
    ['not a link'],
    [`https://open.spotify.com/track/${ID}`],
    [`https://open.spotify.com/album/${ID}`],
    [`http://open.spotify.com/artist/${ID}`],
    [`https://evil.example/artist/${ID}`],
    [`https://open.spotify.com.evil.example/artist/${ID}`],
    [`spotify:track:${ID}`],
    ['https://open.spotify.com/artist/short'],
    [`https://open.spotify.com/artist/${ID}x`],
  ])('rejects %s', (link) => {
    expect(parseSpotifyArtistLink(link)).toBeNull();
  });
});
