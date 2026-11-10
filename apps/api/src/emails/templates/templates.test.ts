import { describe, expect, it } from 'vitest';

import { getTemplateRenderer } from '../registry.js';
import type { RenderedEmail } from '../types.js';
import { renderSpotifyDigest } from './spotify-digest.js';

const DIGEST_SHOW = {
  artist: 'Sleep Token',
  tourName: 'Even In Arcadia Tour',
  venue: 'Fillmore Auditorium',
  dateLabel: 'Thu · Jul 17',
  priceLabel: '$42',
  url: 'https://concertcrawl.app/events/sample-1',
};

const digestShows = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    ...DIGEST_SHOW,
    artist: `Artist ${i + 1}`,
    url: `https://concertcrawl.app/events/sample-${i + 1}`,
  }));

// Bounds relaxed for the #783 branded voice — subjects and preheaders are more
// conversational than the old system's terse lines. The footer now reads
// "Turn off {family} emails" (per-family unsubscribe), not "Manage emails".
const assertShellContract = (rendered: RenderedEmail): void => {
  expect(rendered.subject.length).toBeGreaterThanOrEqual(20);
  expect(rendered.subject.length).toBeLessThanOrEqual(65);
  expect(rendered.preheader.length).toBeGreaterThanOrEqual(40);
  expect(rendered.preheader.length).toBeLessThanOrEqual(120);
  expect(rendered.subject).not.toMatch(/\p{Extended_Pictographic}/u);
  expect(rendered.subject).not.toMatch(/\[concert crawl\]/i);
  expect(rendered.html).toContain('<!doctype html>');
  expect(rendered.html).toContain('Turn off');
  expect(rendered.text).toContain('Concert Crawl · Denver, CO');
};

describe('shell contract across all templates', () => {
  const renderedEmails: [string, RenderedEmail][] = [
    [
      'spotify_digest',
      renderSpotifyDigest({
        shows: digestShows(6),
        tastePicks: [],
        unsubscribeUrl: 'https://api.example.com/v1/email/unsubscribe?x=y',
      }),
    ],
    [
      'spotify_digest (zero week)',
      renderSpotifyDigest({
        shows: [],
        tastePicks: digestShows(2),
        unsubscribeUrl: null,
      }),
    ],
  ];

  it.each(renderedEmails)(
    '%s meets subject/preheader/html/text requirements',
    (_key, rendered) => {
      assertShellContract(rendered);
    },
  );
});

describe('registry', () => {
  it('returns a renderer for each live template', () => {
    expect(getTemplateRenderer('spotify_digest')).toBeTypeOf('function');
  });
});

describe('spotify_digest (#763 §8.2)', () => {
  it('features at most 5 shows and collapses the rest into "+N more"', () => {
    const rendered = renderSpotifyDigest({
      shows: digestShows(7),
      tastePicks: [],
      unsubscribeUrl: null,
    });
    expect(rendered.subject).toContain('7 shows');
    expect(rendered.html).toContain('Artist 5');
    expect(rendered.html).not.toContain('Artist 6');
    expect(rendered.html).toContain('+2 more this week');
    expect(rendered.text).toContain('+2 more this week');
  });

  it('omits the "+N more" link when 5 or fewer shows match', () => {
    const rendered = renderSpotifyDigest({
      shows: digestShows(3),
      tastePicks: [],
      unsubscribeUrl: null,
    });
    expect(rendered.html).not.toContain('more this week');
    expect(rendered.text).not.toContain('more this week');
  });

  it('uses singular copy for a one-show week', () => {
    const rendered = renderSpotifyDigest({
      shows: digestShows(1),
      tastePicks: [],
      unsubscribeUrl: null,
    });
    expect(rendered.subject).toContain('1 show this week');
    expect(rendered.html).toContain('1 show');
  });

  it('renders the zero-week light variant with up to 2 taste picks', () => {
    const rendered = renderSpotifyDigest({
      shows: [],
      tastePicks: digestShows(3),
      unsubscribeUrl: null,
    });
    expect(rendered.html).toContain('A quiet one for your artists.');
    expect(rendered.html).toContain('Based on your taste');
    expect(rendered.html).toContain('Artist 2');
    expect(rendered.html).not.toContain('Artist 3');
  });

  // The zero variant used to exist only in the HTML branch's full form: the
  // plain-text intro dropped the masthead line the non-zero branch carries,
  // so a text-only client got a headerless email nobody ever looked at.
  it('renders the zero-week variant in the plain-text part too', () => {
    const rendered = renderSpotifyDigest({
      shows: [],
      tastePicks: digestShows(2),
      unsubscribeUrl: null,
    });
    for (const line of [
      'CONCERT CRAWL: This week in Denver',
      'A quiet one for your artists.',
      'Based on your taste',
      'Artist 1',
      'Artist 2',
    ]) {
      expect(rendered.text).toContain(line);
    }
    expect(rendered.html).toContain('This week in Denver');
  });

  // PR 9 generalized the digest to every follow source. Naming Spotify would
  // make it read as a lie to a native follower who never connected it.
  it('names no follow source in either part', () => {
    for (const rendered of [
      renderSpotifyDigest({
        shows: digestShows(2),
        tastePicks: [],
        unsubscribeUrl: null,
      }),
      renderSpotifyDigest({
        shows: [],
        tastePicks: digestShows(2),
        unsubscribeUrl: null,
      }),
    ]) {
      expect(rendered.html).not.toContain('Spotify');
      expect(rendered.text).not.toContain('Spotify');
      expect(rendered.subject).not.toContain('Spotify');
    }
  });

  it('explains the send in both parts without naming a source', () => {
    const rendered = renderSpotifyDigest({
      shows: digestShows(2),
      tastePicks: [],
      unsubscribeUrl: null,
    });
    const note =
      'You get this because you follow artists and turned on the weekly digest.';
    expect(rendered.html).toContain(note);
    expect(rendered.text).toContain(note);
    expect(rendered.text).toContain('2 shows by artists you follow.');
    expect(rendered.text).toContain(
      'All of them playing Denver in the next 7 days.',
    );
    expect(rendered.html).toContain(
      'All of them playing Denver in the next 7 days.',
    );
  });

  it('links the digest-family footer to the signed unsubscribe URL', () => {
    const unsubscribeUrl =
      'https://api.example.com/v1/email/unsubscribe?uid=u1&family=digest&token=abc';
    const rendered = renderSpotifyDigest({
      shows: digestShows(2),
      tastePicks: [],
      unsubscribeUrl,
    });
    expect(rendered.html).toContain('Turn off the weekly digest');
    expect(rendered.html).toContain(
      'https://api.example.com/v1/email/unsubscribe?uid=u1&amp;family=digest&amp;token=abc',
    );
    expect(rendered.text).toContain(
      `Turn off the weekly digest:  ${unsubscribeUrl}`,
    );
  });

  it('falls back to the Settings link when no unsubscribe URL is available', () => {
    const rendered = renderSpotifyDigest({
      shows: digestShows(2),
      tastePicks: [],
      unsubscribeUrl: null,
    });
    expect(rendered.html).toContain('Turn off the weekly digest');
    expect(rendered.html).toContain('/me');
  });

  it('escapes artist-controlled strings', () => {
    const rendered = renderSpotifyDigest({
      shows: [
        {
          ...DIGEST_SHOW,
          artist: '<script>alert(1)</script>',
          tourName: 'Tour & <b>Bold</b>',
        },
      ],
      tastePicks: [],
      unsubscribeUrl: null,
    });
    expect(rendered.html).not.toContain('<script>alert(1)</script>');
    expect(rendered.html).toContain('&lt;script&gt;');
  });
});
