// Unit tests for the artist info resolver's pure checks (artist-search plan
// PR 6): claim ranking, the credit line, and decision 5's Commons licence check.
import { describe, it, expect } from 'vitest';
import { commonsImageFrom, pickImageFile, plainCredit } from './artist-info.js';

const commonsPage = (
  meta: Record<string, string>,
  overrides: Record<string, unknown> = {},
) => ({
  query: {
    pages: [
      {
        imagerepository: 'local',
        imageinfo: [
          {
            thumburl:
              'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Band.jpg/640px-Band.jpg',
            descriptionurl: 'https://commons.wikimedia.org/wiki/File:Band.jpg',
            extmetadata: Object.fromEntries(
              Object.entries(meta).map(([key, value]) => [key, { value }]),
            ),
          },
        ],
        ...overrides,
      },
    ],
  },
});

const FREE_META = {
  License: 'cc-by-sa-4.0',
  LicenseShortName: 'CC BY-SA 4.0',
  LicenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  Artist: '<a href="//commons.wikimedia.org/wiki/User:Jo">Jo &amp; Co</a>',
};

describe('pickImageFile', () => {
  it('prefers a preferred-rank claim and never takes a deprecated one', () => {
    expect(
      pickImageFile([
        { rank: 'deprecated', mainsnak: { datavalue: { value: 'old.jpg' } } },
        { rank: 'normal', mainsnak: { datavalue: { value: 'normal.jpg' } } },
        { rank: 'preferred', mainsnak: { datavalue: { value: 'best.jpg' } } },
      ]),
    ).toBe('best.jpg');
    expect(
      pickImageFile([
        { rank: 'deprecated', mainsnak: { datavalue: { value: 'old.jpg' } } },
      ]),
    ).toBeNull();
    expect(pickImageFile([{ rank: 'normal', mainsnak: {} }])).toBeNull();
  });
});

describe('plainCredit', () => {
  it('strips markup and decodes the common entities', () => {
    expect(plainCredit(FREE_META.Artist)).toBe('Jo & Co');
    expect(plainCredit('<span> </span>')).toBeNull();
  });

  it('decodes an escaped entity once, and numeric entities too', () => {
    expect(plainCredit('&amp;lt;3 Studios')).toBe('&lt;3 Studios');
    expect(plainCredit('Ren&#233;e &#x27;Jo&#x27;')).toBe("Renée 'Jo'");
  });

  it('caps a long credit', () => {
    const credit = plainCredit('x'.repeat(500));
    expect(credit).toHaveLength(200);
    expect(credit?.endsWith('…')).toBe(true);
  });
});

describe('commonsImageFrom (plan decision 5)', () => {
  it('accepts a free Commons file with its credit and licence', () => {
    expect(commonsImageFrom(commonsPage(FREE_META))).toEqual({
      source: 'commons',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Band.jpg/640px-Band.jpg',
      credit: 'Jo & Co',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      fileUrl: 'https://commons.wikimedia.org/wiki/File:Band.jpg',
    });
  });

  it.each([
    ['a non-commercial licence', { License: 'cc-by-nc-sa-4.0' }],
    ['a no-derivatives licence', { License: 'cc-by-nd-4.0' }],
    ['a fair-use file', { License: 'fair use' }],
    ['a GFDL-only file', { License: 'gfdl' }],
    ['a file flagged non-free', { NonFree: 'true' }],
    ['an attribution licence with no author', { Artist: '' }],
    ['a file with no licence name', { LicenseShortName: '' }],
  ])('refuses %s', (_label, change) => {
    expect(
      commonsImageFrom(commonsPage({ ...FREE_META, ...change })),
    ).toBeNull();
  });

  it('refuses a file not hosted on Commons itself', () => {
    expect(
      commonsImageFrom(commonsPage(FREE_META, { imagerepository: 'shared' })),
    ).toBeNull();
    expect(
      commonsImageFrom(commonsPage(FREE_META, { missing: true })),
    ).toBeNull();
  });

  it('refuses a thumbnail off upload.wikimedia.org', () => {
    const body = commonsPage(FREE_META);
    const info = body.query.pages[0]?.imageinfo[0];
    if (info) info.thumburl = 'https://example.com/640px-Band.jpg';
    expect(commonsImageFrom(body)).toBeNull();
  });

  it('upgrades an http Creative Commons link and drops any other http link', () => {
    const upgraded = commonsImageFrom(
      commonsPage({
        ...FREE_META,
        LicenseUrl: 'http://creativecommons.org/licenses/by/2.0',
      }),
    );
    expect(upgraded?.licenseUrl).toBe(
      'https://creativecommons.org/licenses/by/2.0',
    );
    const dropped = commonsImageFrom(
      commonsPage({ ...FREE_META, LicenseUrl: 'http://example.com/licence' }),
    );
    expect(dropped?.licenseUrl).toBeNull();
  });

  it('accepts a public-domain or CC0 file with no author', () => {
    for (const code of ['pd', 'cc0']) {
      const image = commonsImageFrom(
        commonsPage({ License: code, LicenseShortName: 'Public domain' }),
      );
      expect(image).toMatchObject({ source: 'commons', credit: null });
    }
  });
});
