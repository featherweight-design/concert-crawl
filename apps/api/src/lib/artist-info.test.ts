// Unit tests for the artist info resolver (artist-search plan PR 6): the
// Commons licence check, the Wikimedia lookup chain, and the bounded memo.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CRAWLER_USER_AGENT } from '@concert-crawl/types';
import {
  MEMO_FAILURE_TTL_MS,
  MEMO_MAX_ENTRIES,
  MEMO_TTL_MS,
  commonsImageFrom,
  lookupWikimedia,
  pickImageFile,
  plainCredit,
  resetArtistInfoMemo,
  resolveWikimediaInfo,
  type FetchLike,
} from './artist-info.js';

const MBID = '0383dadf-2a4e-4d10-a46a-e9e041da8eb3';
const QID = 'Q1299';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

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

const wikidataBody = (
  title: string | null,
  file: string | null,
  qid: string = QID,
) => ({
  entities: {
    [qid]: {
      sitelinks: title ? { enwiki: { title } } : {},
      claims: file
        ? {
            P18: [{ rank: 'normal', mainsnak: { datavalue: { value: file } } }],
          }
        : {},
    },
  },
});

const summaryBody = (type = 'standard') => ({
  type,
  title: 'The Beatles',
  extract: 'The Beatles were an English rock band.',
  content_urls: {
    desktop: { page: 'https://en.wikipedia.org/wiki/The_Beatles' },
  },
});

/** A fake Wikimedia that answers by host, recording every call. */
const fakeWikimedia = (answers: {
  wikidata?: () => Response;
  summary?: () => Response;
  commons?: () => Response;
}) => {
  const calls: { url: string; userAgent: string | undefined }[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    calls.push({ url, userAgent: init.headers['User-Agent'] });
    const host = new URL(url).hostname;
    const answer =
      host === 'www.wikidata.org'
        ? answers.wikidata
        : host === 'en.wikipedia.org'
          ? answers.summary
          : host === 'commons.wikimedia.org'
            ? answers.commons
            : undefined;
    if (!answer) throw new Error(`unexpected call to ${url}`);
    return answer();
  };
  return { calls, fetchImpl };
};

describe('lookupWikimedia', () => {
  it('follows the sitelink and the image claim, with the bot User-Agent on every call', async () => {
    const { calls, fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody('The Beatles', 'Band.jpg')),
      summary: () => json(summaryBody()),
      commons: () => json(commonsPage(FREE_META)),
    });

    const info = await lookupWikimedia(QID, fetchImpl);
    expect(info.summary).toEqual({
      extract: 'The Beatles were an English rock band.',
      articleTitle: 'The Beatles',
      articleUrl: 'https://en.wikipedia.org/wiki/The_Beatles',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    });
    expect(info.image?.credit).toBe('Jo & Co');
    expect(calls).toHaveLength(3);
    expect(calls.every((call) => call.userAgent === CRAWLER_USER_AGENT)).toBe(
      true,
    );
    expect(calls[1]?.url).toContain('/page/summary/The_Beatles');
  });

  it('drops a disambiguation page', async () => {
    const { fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody('Queen', null)),
      summary: () => json(summaryBody('disambiguation')),
    });
    expect((await lookupWikimedia(QID, fetchImpl)).summary).toBeNull();
  });

  it('drops a no-extract page, which carries no text or link', async () => {
    const { fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody('The Beatles', null)),
      summary: () => json({ type: 'no-extract', title: 'The Beatles' }),
    });
    expect((await lookupWikimedia(QID, fetchImpl)).summary).toBeNull();
  });

  it('treats a deleted item as no data, not a failure', async () => {
    const { fetchImpl } = fakeWikimedia({
      wikidata: () => json({ error: { code: 'no-such-entity' } }),
    });
    expect(await lookupWikimedia(QID, fetchImpl)).toEqual({
      summary: null,
      image: null,
    });
  });

  it('keeps the summary when the Commons half fails, and reports the failure', async () => {
    const failures: unknown[] = [];
    const { fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody('The Beatles', 'Band.jpg')),
      summary: () => json(summaryBody()),
      commons: () => json({}, 500),
    });
    const info = await lookupWikimedia(QID, fetchImpl, (err) =>
      failures.push(err),
    );
    expect(info.summary?.articleTitle).toBe('The Beatles');
    expect(info.image).toBeNull();
    expect(failures).toHaveLength(1);
  });

  it('drops a summary whose article link is off en.wikipedia.org', async () => {
    const { fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody('The Beatles', null)),
      summary: () =>
        json({
          ...summaryBody(),
          content_urls: { desktop: { page: 'https://example.com/x' } },
        }),
    });
    expect((await lookupWikimedia(QID, fetchImpl)).summary).toBeNull();
  });

  it('reads a merged item under the id it redirects to', async () => {
    const { calls, fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody('The Beatles', null, 'Q999')),
      summary: () => json(summaryBody()),
    });
    expect((await lookupWikimedia(QID, fetchImpl)).summary).not.toBeNull();
    expect(calls).toHaveLength(2);
  });

  it('makes no further call when the item has no article and no image', async () => {
    const { calls, fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody(null, null)),
    });
    expect(await lookupWikimedia(QID, fetchImpl)).toEqual({
      summary: null,
      image: null,
    });
    expect(calls).toHaveLength(1);
  });

  it('makes no call at all for a malformed Wikidata id', async () => {
    const { calls, fetchImpl } = fakeWikimedia({});
    await lookupWikimedia('Q1299&action=delete', fetchImpl);
    expect(calls).toHaveLength(0);
  });

  it('throws on an HTTP error so the memo can keep it for less time', async () => {
    const { fetchImpl } = fakeWikimedia({
      wikidata: () => json({}, 503),
    });
    await expect(lookupWikimedia(QID, fetchImpl)).rejects.toThrow('HTTP 503');
  });
});

describe('resolveWikimediaInfo (memo)', () => {
  beforeEach(() => {
    resetArtistInfoMemo();
  });

  it('answers a repeat from the memo and refetches once the day is up', async () => {
    let clock = 1_000;
    const now = () => clock;
    const { calls, fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody(null, null)),
    });

    await resolveWikimediaInfo(MBID, QID, fetchImpl, now);
    await resolveWikimediaInfo(MBID, QID, fetchImpl, now);
    expect(calls).toHaveLength(1);

    clock += MEMO_TTL_MS + 1;
    await resolveWikimediaInfo(MBID, QID, fetchImpl, now);
    expect(calls).toHaveLength(2);
  });

  it('shares one in-flight lookup between concurrent requests', async () => {
    const { calls, fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody(null, null)),
    });
    await Promise.all([
      resolveWikimediaInfo(MBID, QID, fetchImpl),
      resolveWikimediaInfo(MBID, QID, fetchImpl),
    ]);
    expect(calls).toHaveLength(1);
  });

  it('answers empty on a failure, never rejects, and retries after the short window', async () => {
    let clock = 1_000;
    const now = () => clock;
    const { calls, fetchImpl } = fakeWikimedia({
      wikidata: () => json({}, 500),
    });

    expect(await resolveWikimediaInfo(MBID, QID, fetchImpl, now)).toEqual({
      summary: null,
      image: null,
    });
    clock += MEMO_FAILURE_TTL_MS - 1;
    await resolveWikimediaInfo(MBID, QID, fetchImpl, now);
    expect(calls).toHaveLength(1);

    clock += 2;
    await resolveWikimediaInfo(MBID, QID, fetchImpl, now);
    expect(calls).toHaveLength(2);
  });

  it('keeps a partial failure for the short window only', async () => {
    let clock = 1_000;
    const now = () => clock;
    const { calls, fetchImpl } = fakeWikimedia({
      wikidata: () => json(wikidataBody('The Beatles', 'Band.jpg')),
      summary: () => json(summaryBody()),
      commons: () => json({}, 500),
    });

    const info = await resolveWikimediaInfo(MBID, QID, fetchImpl, now);
    expect(info.summary).not.toBeNull();
    expect(calls).toHaveLength(3);

    clock += MEMO_FAILURE_TTL_MS + 1;
    await resolveWikimediaInfo(MBID, QID, fetchImpl, now);
    expect(calls).toHaveLength(6);
  });

  it('keeps a deleted item for the full day', async () => {
    let clock = 1_000;
    const now = () => clock;
    const { calls, fetchImpl } = fakeWikimedia({
      wikidata: () => json({ error: { code: 'no-such-entity' } }),
    });
    await resolveWikimediaInfo(MBID, QID, fetchImpl, now);
    clock += MEMO_FAILURE_TTL_MS + 1;
    await resolveWikimediaInfo(MBID, QID, fetchImpl, now);
    expect(calls).toHaveLength(1);
  });

  it('gives a malformed id no memo slot', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => json({ entities: {} }));
    for (let i = 0; i < MEMO_MAX_ENTRIES; i += 1) {
      await resolveWikimediaInfo(`mbid-${i}`, QID, fetchImpl);
    }
    await resolveWikimediaInfo('mbid-bad', 'not-a-qid', fetchImpl);
    // mbid-0 is still held, so the bad id evicted nothing.
    await resolveWikimediaInfo('mbid-0', QID, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(MEMO_MAX_ENTRIES);
  });

  it('stays bounded, evicting the oldest act first', async () => {
    const fetchImpl = vi.fn<FetchLike>(async () => json({ entities: {} }));
    for (let i = 0; i <= MEMO_MAX_ENTRIES; i += 1) {
      await resolveWikimediaInfo(`mbid-${i}`, QID, fetchImpl);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(MEMO_MAX_ENTRIES + 1);

    // The newest is still held; the first was evicted to make room.
    await resolveWikimediaInfo(`mbid-${MEMO_MAX_ENTRIES}`, QID, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(MEMO_MAX_ENTRIES + 1);
    await resolveWikimediaInfo('mbid-0', QID, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(MEMO_MAX_ENTRIES + 2);
  });
});
