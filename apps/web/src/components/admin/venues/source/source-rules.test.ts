import { describe, expect, it } from 'vitest';
import { buildUpdateVenueBody } from '@/lib/actions/build-update-venue-body';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  PAGE_LOADINGS,
  READERS,
  READ_MODES,
  SOURCE_COLUMNS,
  advancedUnsavedCount,
  backToAutomatic,
  canGoBackToAutomatic,
  changedColumns,
  closedChipsOf,
  columnsOf,
  crawlModeOf,
  dirtyColumns,
  draftOf,
  isStoredManual,
  paceLine,
  pageLoadingOf,
  pristineColumns,
  readModeOf,
  readerLockOf,
  readerOf,
  robotsStateOf,
  scheduleLine,
  venueNextCrawlAt,
  sourceFieldOf,
  sourceFormData,
  stillSavedLine,
  validateSource,
  type ReadMode,
  type Reader,
  type SourceColumns,
  type SourceDraft,
} from './source-rules';

const COPY = ADMIN_COPY.venueSource;

const base: SourceColumns = {
  websiteUrl: 'https://gothic.example/events',
  extractionStrategy: null,
  platform: null,
  platformVenueId: null,
  apiProvider: null,
  apiAccountId: null,
  crawlMode: 'http',
  crawlModeSource: 'admin',
  crawlWaitUntil: 'networkidle',
  crawlWaitForSelector: null,
};

/**
 * Every configuration on main (split plan row 6): the radio and seller it
 * reads as, and the columns an untouched save would write back.
 */
const CONFIGS: Array<{
  name: string;
  columns: SourceColumns;
  mode: SourceDraft['mode'];
  seller: SourceDraft['seller'];
  feedId: string;
  reader: SourceDraft['reader'];
}> = [
  {
    name: 'VenuePilot',
    columns: { ...base, apiProvider: 'venuepilot', apiAccountId: '1105' },
    mode: 'feed',
    seller: 'venuepilot',
    feedId: '1105',
    reader: 'auto',
  },
  {
    name: 'AEG',
    columns: { ...base, platform: 'aeg', platformVenueId: '89' },
    mode: 'feed',
    seller: 'aeg',
    feedId: '89',
    reader: 'auto',
  },
  {
    name: 'Live Nation',
    columns: {
      ...base,
      platform: 'livenation',
      platformVenueId: 'KovZpZAE6eJA',
    },
    mode: 'feed',
    seller: 'livenation',
    feedId: 'KovZpZAE6eJA',
    reader: 'auto',
  },
  {
    // Ticketure is read by the cascade's own extractor: nothing is set.
    name: 'Ticketure (the cascade)',
    columns: base,
    mode: 'page',
    seller: null,
    feedId: '',
    reader: 'auto',
  },
  {
    name: 'detail-page',
    columns: { ...base, platform: 'detail-page', crawlMode: 'browser' },
    mode: 'page',
    seller: null,
    feedId: '',
    reader: 'detail-page',
  },
  {
    name: 'page loading the crawler picked',
    columns: { ...base, crawlMode: 'browser', crawlModeSource: 'auto' },
    mode: 'page',
    seller: null,
    feedId: '',
    reader: 'auto',
  },
  {
    name: 'page loading of unknown source',
    columns: { ...base, crawlMode: 'http', crawlModeSource: null },
    mode: 'page',
    seller: null,
    feedId: '',
    reader: 'auto',
  },
  {
    name: 'page loading not pinned',
    columns: { ...base, crawlMode: null, crawlModeSource: null },
    mode: 'page',
    seller: null,
    feedId: '',
    reader: 'auto',
  },
  {
    name: 'JSON-LD forced',
    columns: { ...base, extractionStrategy: 'structured_data' },
    mode: 'page',
    seller: null,
    feedId: '',
    reader: 'structured_data',
  },
  {
    name: 'Haiku forced',
    columns: { ...base, extractionStrategy: 'llm' },
    mode: 'page',
    seller: null,
    feedId: '',
    reader: 'llm',
  },
  {
    // Don't crawl is out of 6b: the crawler reads the page regardless.
    name: 'manual',
    columns: { ...base, extractionStrategy: 'manual' },
    mode: 'page',
    seller: null,
    feedId: '',
    reader: 'auto',
  },
];

describe('source mapping: columns to the radio', () => {
  it.each(CONFIGS)(
    '$name reads as $mode',
    ({ columns, mode, seller, feedId, reader }) => {
      const draft = draftOf(columns);
      expect(readModeOf(columns)).toBe(mode);
      expect(draft).toMatchObject({ mode, seller, feedId, reader });
    },
  );

  it.each(CONFIGS)('$name writes itself back unchanged', ({ columns }) => {
    expect(columnsOf(draftOf(columns), columns)).toEqual(columns);
    expect(dirtyColumns(draftOf(columns), columns)).toEqual([]);
  });

  it('has no Don’t crawl radio: a stored manual reads as what the crawler does', () => {
    expect(READ_MODES).toEqual(['page', 'feed']);
    expect(isStoredManual({ ...base, extractionStrategy: 'manual' })).toBe(
      true,
    );
    expect(isStoredManual(base)).toBe(false);
    expect(
      readModeOf({
        ...base,
        extractionStrategy: 'manual',
        apiProvider: 'venuepilot',
        apiAccountId: '1105',
      }),
    ).toBe('feed');
  });
});

describe('source mapping: the radio to columns', () => {
  const draft = (patch: Partial<SourceDraft>): SourceDraft => ({
    ...draftOf(base),
    ...patch,
  });

  it('Calendar page clears every feed and writes the reader', () => {
    const saved: SourceColumns = {
      ...base,
      apiProvider: 'venuepilot',
      apiAccountId: '1105',
    };
    expect(
      columnsOf({ ...draftOf(saved), mode: 'page', reader: 'llm' }, saved),
    ).toEqual({ ...base, extractionStrategy: 'llm' });
  });

  it('Calendar page keeps detail-page, and drops AEG', () => {
    const detail: SourceColumns = { ...base, platform: 'detail-page' };
    expect(columnsOf(draftOf(detail), detail).platform).toBe('detail-page');
    const aeg: SourceColumns = {
      ...base,
      platform: 'aeg',
      platformVenueId: '89',
    };
    expect(columnsOf({ ...draftOf(aeg), mode: 'page' }, aeg)).toMatchObject({
      platform: null,
      platformVenueId: null,
    });
  });

  it('Ticketing feed, VenuePilot: the provider and account ID, no platform', () => {
    const saved: SourceColumns = { ...base, platform: 'detail-page' };
    expect(
      columnsOf(
        draft({ mode: 'feed', seller: 'venuepilot', feedId: ' 1105 ' }),
        saved,
      ),
    ).toEqual({
      ...base,
      apiProvider: 'venuepilot',
      apiAccountId: '1105',
    });
  });

  it.each(['aeg', 'livenation'] as const)(
    'Ticketing feed, %s: the platform and its venue ID, no provider',
    (seller) => {
      const saved: SourceColumns = {
        ...base,
        apiProvider: 'venuepilot',
        apiAccountId: '1105',
        extractionStrategy: 'llm',
      };
      expect(
        columnsOf(draft({ mode: 'feed', seller, feedId: 'X1' }), saved),
      ).toEqual({ ...base, platform: seller, platformVenueId: 'X1' });
    },
  );

  it('a feed keeps the saved calendar page, whatever the hidden input holds', () => {
    expect(
      columnsOf(
        draft({
          mode: 'feed',
          seller: 'aeg',
          feedId: '89',
          websiteUrl: 'https://elsewhere.example',
        }),
        base,
      ).websiteUrl,
    ).toBe(base.websiteUrl);
  });

  it('a stored manual stays untouched until the reader changes', () => {
    const manual: SourceColumns = { ...base, extractionStrategy: 'manual' };
    expect(
      columnsOf(
        { ...draftOf(manual), websiteUrl: 'https://gothic.example/cal' },
        manual,
      ).extractionStrategy,
    ).toBe('manual');
    expect(
      columnsOf({ ...draftOf(manual), reader: 'llm' }, manual)
        .extractionStrategy,
    ).toBe('llm');
  });

  const combos = READ_MODES.flatMap((mode) =>
    READERS.map((reader): [ReadMode, Reader] => [mode, reader]),
  );
  it.each(combos)('never writes manual (%s, %s)', (mode, reader) => {
    const next = columnsOf(
      draft({ mode, seller: 'aeg', feedId: '89', reader }),
      base,
    );
    expect(next.extractionStrategy).not.toBe('manual');
    // A stored manual only stays as it is (the unchanged reader, or Detail
    // pages, which is a platform and leaves the strategy alone); every other
    // reader, and a feed, replaces it.
    const manual: SourceColumns = { ...base, extractionStrategy: 'manual' };
    const changed = columnsOf(
      draft({ mode, seller: 'aeg', feedId: '89', reader }),
      manual,
    );
    const keepsStored =
      mode === 'page' &&
      (reader === readerOf(manual) || reader === 'detail-page');
    if (!keepsStored) {
      expect(changed.extractionStrategy).not.toBe('manual');
    }
  });

  it('Detail pages sets the detail-page platform, with no ID, and keeps the strategy', () => {
    const saved: SourceColumns = { ...base, extractionStrategy: 'llm' };
    expect(
      columnsOf({ ...draftOf(saved), reader: 'detail-page' }, saved),
    ).toEqual({
      ...saved,
      platform: 'detail-page',
      platformVenueId: null,
    });
  });

  it.each([
    ['auto', null],
    ['structured_data', 'structured_data'],
    ['llm', 'llm'],
  ] as const)(
    'moving off Detail pages to %s clears the platform',
    (reader, strategy) => {
      const detail: SourceColumns = { ...base, platform: 'detail-page' };
      expect(columnsOf({ ...draftOf(detail), reader }, detail)).toEqual({
        ...base,
        extractionStrategy: strategy,
      });
    },
  );

  it('page loading maps Automatic to a null crawl mode, both ways', () => {
    expect(PAGE_LOADINGS).toEqual(['auto', 'http', 'browser']);
    expect(pageLoadingOf(null)).toBe('auto');
    expect(pageLoadingOf('http')).toBe('http');
    expect(pageLoadingOf('browser')).toBe('browser');
    expect(crawlModeOf('auto')).toBe(null);
    expect(crawlModeOf('http')).toBe('http');
    expect(crawlModeOf('browser')).toBe('browser');
    const browser: SourceColumns = { ...base, crawlMode: 'browser' };
    expect(
      columnsOf(
        { ...draftOf(browser), crawlMode: crawlModeOf('auto') },
        browser,
      ).crawlMode,
    ).toBe(null);
  });

  it('Advanced writes page loading, wait until and a trimmed selector', () => {
    expect(
      columnsOf(
        draft({ crawlMode: 'browser', waitUntil: 'load', waitFor: ' .ev ' }),
        base,
      ),
    ).toMatchObject({
      crawlMode: 'browser',
      crawlWaitUntil: 'load',
      crawlWaitForSelector: '.ev',
    });
    expect(
      columnsOf(draft({ waitFor: '   ' }), base).crawlWaitForSelector,
    ).toBe(null);
  });
});

describe('what a Source save sends', () => {
  it('sends only the changed columns', () => {
    const next = { ...base, websiteUrl: 'https://gothic.example/cal' };
    expect(changedColumns(next, base)).toEqual(['websiteUrl']);
  });

  it('sends each pair whole', () => {
    const aeg: SourceColumns = {
      ...base,
      platform: 'aeg',
      platformVenueId: '89',
    };
    expect(changedColumns({ ...aeg, platformVenueId: '90' }, aeg)).toEqual([
      'platform',
      'platformVenueId',
    ]);
    const vp: SourceColumns = {
      ...base,
      apiProvider: 'venuepilot',
      apiAccountId: '1',
    };
    expect(changedColumns({ ...vp, apiAccountId: '2' }, vp)).toEqual([
      'apiProvider',
      'apiAccountId',
    ]);
  });

  it.each<[string, SourceColumns]>([
    ['an account ID with no provider', { ...base, apiAccountId: 'stale' }],
    ['a venue ID with no platform', { ...base, platformVenueId: 'stale' }],
    [
      'a feed with a stored reader',
      {
        ...base,
        platform: 'aeg',
        platformVenueId: '89',
        extractionStrategy: 'llm',
      },
    ],
  ])('never reads an old row’s leftovers as an edit: %s', (_name, orphan) => {
    // The raw row would read as changed; the pristine baseline does not.
    expect(dirtyColumns(draftOf(orphan), orphan)).toEqual([]);
  });

  it('sends only the real edit on a row with leftovers', () => {
    const orphan: SourceColumns = { ...base, apiAccountId: 'stale' };
    expect(
      dirtyColumns(
        { ...draftOf(orphan), websiteUrl: 'https://gothic.example/cal' },
        orphan,
      ),
    ).toEqual(['websiteUrl']);
  });

  it('lets an old browser venue with no selector change its calendar page', () => {
    const browser: SourceColumns = {
      ...base,
      crawlMode: 'browser',
      crawlWaitForSelector: null,
    };
    const keys = dirtyColumns(
      { ...draftOf(browser), websiteUrl: 'https://gothic.example/cal' },
      browser,
    );
    expect(keys).toEqual(['websiteUrl']);
  });

  it('lists no crawl-rule column among the Source columns', () => {
    for (const rule of [
      'crawlDelayMs',
      'robotsTxtAllowed',
      'robotsTxtCheckedAt',
      'userAgent',
    ]) {
      expect(SOURCE_COLUMNS).not.toContain(rule);
    }
  });

  it('builds a body of Source fields only', () => {
    const next: SourceColumns = {
      ...base,
      platform: 'aeg',
      platformVenueId: '89',
      extractionStrategy: null,
    };
    const keys = changedColumns(next, base);
    const body = Object.fromEntries(
      Object.entries(buildUpdateVenueBody(sourceFormData(next, keys))).filter(
        ([, value]) => value !== undefined,
      ),
    );
    expect(body).toEqual({ platform: 'aeg', platformVenueId: '89' });
  });

  it('sends a switch to VenuePilot as both pairs, clearing the platform', () => {
    const saved: SourceColumns = {
      ...base,
      platform: 'aeg',
      platformVenueId: '89',
    };
    const next = columnsOf(
      { ...draftOf(saved), seller: 'venuepilot', feedId: '1105' },
      saved,
    );
    const body = buildUpdateVenueBody(
      sourceFormData(next, changedColumns(next, saved)),
    );
    expect(body).toMatchObject({
      platform: null,
      platformVenueId: null,
      apiProvider: 'venuepilot',
      apiAccountId: '1105',
    });
    expect(body.websiteUrl).toBeUndefined();
    expect(body.name).toBeUndefined();
  });

  it('sends a calendar page edit on a manual venue without the strategy', () => {
    const manual: SourceColumns = { ...base, extractionStrategy: 'manual' };
    const next = columnsOf(
      { ...draftOf(manual), websiteUrl: 'https://gothic.example/cal' },
      manual,
    );
    expect(changedColumns(next, pristineColumns(manual))).toEqual([
      'websiteUrl',
    ]);
  });

  it('sends Detail pages as the platform pair, and moving off it clears it', () => {
    const on = columnsOf({ ...draftOf(base), reader: 'detail-page' }, base);
    const onBody = buildUpdateVenueBody(
      sourceFormData(on, changedColumns(on, base)),
    );
    expect(
      Object.entries(onBody).filter(([, value]) => value !== undefined),
    ).toEqual([
      ['platform', 'detail-page'],
      ['platformVenueId', null],
    ]);

    const detail: SourceColumns = { ...base, platform: 'detail-page' };
    const off = columnsOf({ ...draftOf(detail), reader: 'auto' }, detail);
    const offBody = buildUpdateVenueBody(
      sourceFormData(off, changedColumns(off, detail)),
    );
    expect(offBody).toMatchObject({ platform: null, platformVenueId: null });
    expect(offBody.extractionStrategy).toBeUndefined();
  });
});

describe('Advanced: Automatic and set by hand (item 18)', () => {
  const auto: SourceColumns = {
    ...base,
    crawlMode: null,
    crawlModeSource: null,
  };
  /** A crawl mode stored by `source`: 'admin' is set by hand. */
  const mode = (
    crawlMode: 'http' | 'browser',
    crawlModeSource: SourceColumns['crawlModeSource'],
  ) => ({ crawlMode, crawlModeSource });
  const aeg: SourceColumns = {
    ...auto,
    platform: 'aeg',
    platformVenueId: '89',
  };
  const liveNation: SourceColumns = {
    ...auto,
    platform: 'livenation',
    platformVenueId: 'K1',
  };
  const venuePilot: SourceColumns = {
    ...auto,
    apiProvider: 'venuepilot',
    apiAccountId: '1105',
  };
  const manual: SourceColumns = { ...auto, extractionStrategy: 'manual' };

  /** The draft after Back to Automatic's patch. */
  const afterBack = (draft: SourceDraft): SourceDraft => ({
    ...draft,
    ...backToAutomatic(draft),
  });

  /** What Back to Automatic then Save sends, as the PATCH body. */
  const backToAutomaticBody = (saved: SourceColumns) => {
    const next = afterBack(draftOf(saved));
    const body = buildUpdateVenueBody(
      sourceFormData(columnsOf(next, saved), dirtyColumns(next, saved)),
    );
    return Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== undefined),
    );
  };

  it.each([
    ['Automatic', auto, null],
    ['JSON-LD only', { ...auto, extractionStrategy: 'structured_data' }, null],
    ['Haiku only', { ...auto, extractionStrategy: 'llm' }, null],
    ['Detail pages', { ...auto, platform: 'detail-page' }, null],
    ['VenuePilot', venuePilot, null],
    ['AEG', aeg, { kind: 'feed', seller: 'aeg' }],
    ['Live Nation', liveNation, { kind: 'feed', seller: 'livenation' }],
    ['manual', manual, { kind: 'manual' }],
    ['manual on Detail pages', { ...manual, platform: 'detail-page' }, null],
  ] as const)('locks the reader of %s as %j', (_name, columns, lock) => {
    expect(readerLockOf(draftOf(columns), columns)).toEqual(lock);
  });

  const forced = (text: string) => ({ kind: 'forced', text });
  const locked = (text: string) => ({ kind: 'lock', text });

  it.each([
    ['all automatic', auto, []],
    // Set by hand ('admin'): a chip, first.
    ['Plain fetch', base, [forced('Page loading: Plain fetch')]],
    [
      'Full browser by hand',
      { ...auto, ...mode('browser', 'admin') },
      [forced('Page loading: Full browser')],
    ],
    // The crawler's own pick, or an unknown one, reads as Automatic.
    [
      'Full browser by the crawler',
      { ...auto, ...mode('browser', 'auto') },
      [],
    ],
    ['Full browser, unknown', { ...auto, ...mode('browser', null) }, []],
    ['Plain fetch, unknown', { ...auto, ...mode('http', null) }, []],
    // Wait until has no Automatic, so it is never a chip.
    ['Wait until load', { ...auto, crawlWaitUntil: 'load' }, []],
    [
      'JSON-LD only',
      { ...auto, extractionStrategy: 'structured_data' },
      [forced('Reader: JSON-LD only')],
    ],
    [
      'Full browser and Haiku only',
      { ...auto, ...mode('browser', 'admin'), extractionStrategy: 'llm' },
      [forced('Page loading: Full browser'), forced('Reader: Haiku only')],
    ],
    [
      'the crawler’s Full browser and Haiku only',
      { ...auto, ...mode('browser', 'auto'), extractionStrategy: 'llm' },
      [forced('Reader: Haiku only')],
    ],
    [
      'Plain fetch, Haiku only and a Wait for selector',
      {
        ...base,
        extractionStrategy: 'llm',
        crawlWaitForSelector: '.ev',
      },
      [
        forced('Page loading: Plain fetch'),
        forced('Reader: Haiku only'),
        forced('Wait for: .ev'),
      ],
    ],
    [
      'AEG with Full browser by hand',
      { ...aeg, ...mode('browser', 'admin') },
      [forced('Page loading: Full browser'), locked('Reader: AEG')],
    ],
    [
      'Detail pages',
      { ...auto, platform: 'detail-page' },
      [forced('Reader: Detail pages')],
    ],
    [
      'a Wait for selector',
      { ...auto, crawlWaitForSelector: '.event-list' },
      [forced('Wait for: .event-list')],
    ],
    [
      'Haiku only and a Wait for selector',
      { ...auto, extractionStrategy: 'llm', crawlWaitForSelector: '.ev' },
      [forced('Reader: Haiku only'), forced('Wait for: .ev')],
    ],
    ['AEG', aeg, [locked('Reader: AEG')]],
    ['Live Nation', liveNation, [locked('Reader: Live Nation')]],
    ['manual', manual, [locked('Reader: Manual entry')]],
    [
      'AEG with a Wait for selector',
      { ...aeg, crawlWaitForSelector: '.ev' },
      [locked('Reader: AEG'), forced('Wait for: .ev')],
    ],
    ['VenuePilot', venuePilot, []],
  ] as const)('chips %s as %j', (_name, columns, chips) => {
    expect(closedChipsOf(draftOf(columns), columns)).toEqual(chips);
  });

  it('a Wait for selector alone offers no Back to Automatic', () => {
    expect(
      canGoBackToAutomatic(
        draftOf({ ...auto, crawlWaitForSelector: '.event-list' }),
      ),
    ).toBe(false);
  });

  it('offers Back to Automatic only with something it can clear', () => {
    expect(canGoBackToAutomatic(draftOf(auto))).toBe(false);
    expect(canGoBackToAutomatic(draftOf(aeg))).toBe(false);
    expect(canGoBackToAutomatic(draftOf(liveNation))).toBe(false);
    expect(canGoBackToAutomatic(draftOf(manual))).toBe(false);
    // A Page loading set by hand, on a page or a feed.
    expect(canGoBackToAutomatic(draftOf(base))).toBe(true);
    expect(
      canGoBackToAutomatic(draftOf({ ...aeg, ...mode('browser', 'admin') })),
    ).toBe(true);
    // The crawler's own pick, or an unknown one, is not set by hand.
    for (const source of ['auto', null] as const) {
      expect(
        canGoBackToAutomatic(draftOf({ ...auto, ...mode('browser', source) })),
      ).toBe(false);
      expect(
        canGoBackToAutomatic(draftOf({ ...aeg, ...mode('browser', source) })),
      ).toBe(false);
    }
    for (const strategy of ['structured_data', 'llm'] as const) {
      expect(
        canGoBackToAutomatic(
          draftOf({ ...auto, extractionStrategy: strategy }),
        ),
      ).toBe(true);
    }
    expect(
      canGoBackToAutomatic(draftOf({ ...auto, platform: 'detail-page' })),
    ).toBe(true);
  });

  it('sets Page loading and Reader to Automatic, and leaves the waits', () => {
    const saved: SourceColumns = {
      ...auto,
      ...mode('browser', 'admin'),
      extractionStrategy: 'llm',
      crawlWaitUntil: 'load',
      crawlWaitForSelector: '.event-list',
    };
    // A patch of the forced settings, never the whole draft.
    expect(backToAutomatic(draftOf(saved))).toEqual({
      crawlMode: null,
      reader: 'auto',
    });
    const next = afterBack(draftOf(saved));
    // Wait for is left alone, so it stays a chip.
    expect(closedChipsOf(next, saved)).toEqual([
      forced('Wait for: .event-list'),
    ]);
    expect(advancedUnsavedCount(next, draftOf(saved))).toBe(2);
    expect(backToAutomaticBody(saved)).toEqual({
      crawlMode: null,
      extractionStrategy: null,
    });
  });

  it('sets the Reader to Automatic, and leaves the crawler’s own Page loading', () => {
    for (const source of ['auto', null] as const) {
      const saved: SourceColumns = {
        ...auto,
        ...mode('browser', source),
        extractionStrategy: 'llm',
      };
      expect(backToAutomatic(draftOf(saved))).toEqual({ reader: 'auto' });
      // Regression: never crawlMode, which the crawler stored itself.
      expect(backToAutomaticBody(saved)).toEqual({ extractionStrategy: null });
    }
  });

  it.each([
    ['the crawler’s', 'auto'],
    ['an unknown', null],
  ] as const)(
    'Page loading over %s pick: Automatic is no change, a pick by hand is',
    (_name, source) => {
      const saved: SourceColumns = { ...auto, ...mode('browser', source) };
      const savedDraft = draftOf(saved);
      expect(savedDraft.crawlMode).toBe(null);
      expect(dirtyColumns(savedDraft, saved)).toEqual([]);
      // Picking the crawler's own mode adopts it as the admin's.
      for (const crawlMode of ['http', 'browser'] as const) {
        const next = { ...savedDraft, crawlMode };
        expect(advancedUnsavedCount(next, savedDraft)).toBe(1);
        expect(dirtyColumns(next, saved)).toEqual(['crawlMode']);
        expect(
          buildUpdateVenueBody(
            sourceFormData(columnsOf(next, saved), dirtyColumns(next, saved)),
          ).crawlMode,
        ).toBe(crawlMode);
        expect(columnsOf(next, saved).crawlModeSource).toBe('admin');
      }
    },
  );

  it('Automatic over a Page loading set by hand sends a null crawl mode', () => {
    const saved: SourceColumns = { ...auto, ...mode('http', 'admin') };
    const next = { ...draftOf(saved), crawlMode: null };
    expect(draftOf(saved).crawlMode).toBe('http');
    expect(dirtyColumns(next, saved)).toEqual(['crawlMode']);
    expect(columnsOf(next, saved)).toMatchObject({
      crawlMode: null,
      crawlModeSource: null,
    });
  });

  it.each([
    [
      'JSON-LD only',
      { ...auto, extractionStrategy: 'structured_data' },
      { extractionStrategy: null },
    ],
    [
      'Haiku only',
      { ...auto, extractionStrategy: 'llm' },
      { extractionStrategy: null },
    ],
    [
      'Detail pages',
      { ...auto, platform: 'detail-page' },
      { platform: null, platformVenueId: null },
    ],
    [
      'Detail pages over a stored Haiku',
      { ...auto, platform: 'detail-page', extractionStrategy: 'llm' },
      { extractionStrategy: null, platform: null, platformVenueId: null },
    ],
    ['Plain fetch by hand', base, { crawlMode: null }],
    [
      'Full browser by hand',
      { ...auto, ...mode('browser', 'admin') },
      { crawlMode: null },
    ],
    ['the crawler’s Full browser', { ...auto, ...mode('browser', 'auto') }, {}],
    ['an unknown Full browser', { ...auto, ...mode('browser', null) }, {}],
  ] as const)('Back to Automatic on %s sends %j', (_name, saved, body) => {
    expect(backToAutomaticBody(saved)).toEqual(body);
  });

  it.each([
    ['AEG', aeg],
    ['Live Nation', liveNation],
  ] as const)('Back to Automatic leaves the %s feed alone', (_name, feed) => {
    const saved: SourceColumns = { ...feed, crawlMode: 'browser' };
    expect(backToAutomatic(draftOf(saved))).toEqual({});
    const next = columnsOf(afterBack(draftOf(saved)), saved);
    expect(next.platform).toBe(saved.platform);
    expect(next.platformVenueId).toBe(saved.platformVenueId);
    expect(backToAutomaticBody(saved)).toEqual({});
    expect(backToAutomaticBody(feed)).toEqual({});
    // A Page loading set by hand on a feed goes back; the feed stays.
    expect(
      backToAutomaticBody({ ...feed, ...mode('browser', 'admin') }),
    ).toEqual({ crawlMode: null });
  });

  it('Back to Automatic leaves a stored manual alone', () => {
    const saved: SourceColumns = { ...manual, crawlMode: 'http' };
    expect(columnsOf(afterBack(draftOf(saved)), saved).extractionStrategy).toBe(
      'manual',
    );
    expect(backToAutomaticBody(saved)).toEqual({});
  });

  it('Back to Automatic on a manual venue on Detail pages keeps its manual', () => {
    const saved: SourceColumns = { ...manual, platform: 'detail-page' };
    expect(canGoBackToAutomatic(draftOf(saved))).toBe(true);
    expect(columnsOf(afterBack(draftOf(saved)), saved).extractionStrategy).toBe(
      'manual',
    );
    // Only the platform goes; regression: never extractionStrategy: null.
    expect(backToAutomaticBody(saved)).toEqual({
      platform: null,
      platformVenueId: null,
    });
  });

  it('counts the unsaved Advanced settings', () => {
    const saved = draftOf({ ...auto, extractionStrategy: 'structured_data' });
    expect(advancedUnsavedCount(saved, saved)).toBe(0);
    expect(advancedUnsavedCount(afterBack(saved), saved)).toBe(1);
    expect(
      advancedUnsavedCount(
        { ...saved, crawlMode: 'browser', waitUntil: 'load', waitFor: '.ev' },
        saved,
      ),
    ).toBe(3);
    // A selector that only gains spaces is not an edit.
    expect(advancedUnsavedCount({ ...saved, waitFor: '  ' }, saved)).toBe(0);
    // A feed shows no reader picker, so a leftover reader is not counted.
    expect(
      advancedUnsavedCount(
        { ...saved, mode: 'feed', seller: 'aeg', feedId: '89', reader: 'auto' },
        saved,
      ),
    ).toBe(0);
    // The calendar page is not an Advanced setting.
    expect(
      advancedUnsavedCount(
        { ...saved, websiteUrl: 'https://x.example' },
        saved,
      ),
    ).toBe(0);
  });
});

describe('Source validation', () => {
  it.each(['javascript:alert(1)', 'ftp://gothic.example/events', 'not a url'])(
    'refuses a calendar page of %s',
    (websiteUrl) => {
      expect(validateSource({ ...draftOf(base), websiteUrl })).toEqual({
        websiteUrl: COPY.read.calendarPage.invalid,
      });
    },
  );

  it('accepts http and https', () => {
    expect(
      validateSource({ ...draftOf(base), websiteUrl: 'http://gothic.example' }),
    ).toEqual({});
  });

  it('does not check a calendar page it does not write', () => {
    expect(
      validateSource({
        ...draftOf(base),
        mode: 'feed',
        seller: 'aeg',
        feedId: '89',
        websiteUrl: 'javascript:alert(1)',
      }),
    ).toEqual({});
  });

  it('wants a seller and its venue ID for a feed', () => {
    expect(validateSource({ ...draftOf(base), mode: 'feed' })).toEqual({
      mode: COPY.read.seller.required,
    });
    expect(
      validateSource({ ...draftOf(base), mode: 'feed', seller: 'aeg' }),
    ).toEqual({ feedId: COPY.read.feedId.required('AEG') });
  });

  it('lands the API’s field on its input', () => {
    expect(sourceFieldOf('websiteUrl')).toBe('websiteUrl');
    expect(sourceFieldOf('platformVenueId')).toBe('feedId');
    expect(sourceFieldOf('apiAccountId')).toBe('feedId');
    expect(sourceFieldOf('crawlWaitForSelector')).toBe('waitFor');
    expect(sourceFieldOf('slug')).toBeNull();
    expect(sourceFieldOf(undefined)).toBeNull();
  });
});

describe('the read-only cards', () => {
  it('shows the 3 s floor, or the venue’s higher delay', () => {
    expect(paceLine(3000)).toBe(COPY.rules.paceValue('3'));
    expect(paceLine(1000)).toBe(COPY.rules.paceValue('3'));
    expect(paceLine(10000)).toBe(COPY.rules.paceValue('10'));
    expect(paceLine(4500)).toBe(COPY.rules.paceValue('4.5'));
    expect(paceLine(3999)).toBe(COPY.rules.paceValue('4'));
    expect(paceLine(3240)).toBe(COPY.rules.paceValue('3.2'));
    // The verified pace (#465's /bot fix): every page or API call waits.
    expect(paceLine(3000)).toBe(
      '3 s minimum before each page or API call, plus jitter',
    );
  });

  it('checks the venue read’s next crawl once, at the fetch', () => {
    expect(venueNextCrawlAt('2026-11-14T09:07:00.000Z')).toBe(
      '2026-11-14T09:07:00.000Z',
    );
    expect(venueNextCrawlAt(null)).toBeNull();
    expect(venueNextCrawlAt(undefined)).toBeNull();
    expect(venueNextCrawlAt('not a time')).toBeNull();
    expect(venueNextCrawlAt(42)).toBeNull();
  });

  it('names the schedule in Mountain time, or nothing', () => {
    expect(scheduleLine('2026-11-14T09:07:00.000Z')).toBe('Daily, 2:07 AM MT');
    expect(scheduleLine('2026-07-14T09:07:00.000Z')).toBe('Daily, 3:07 AM MT');
    expect(scheduleLine(null)).toBeNull();
    expect(scheduleLine(undefined)).toBeNull();
  });

  it('reads the stored robots verdict', () => {
    expect(robotsStateOf(true)).toBe('allowed');
    expect(robotsStateOf(false)).toBe('disallowed');
    expect(robotsStateOf(null)).toBe('unchecked');
  });

  it('says what is still saved after a failure', () => {
    expect(stillSavedLine(base)).toBe(COPY.failed.saved.page);
    expect(
      stillSavedLine({ ...base, platform: 'aeg', platformVenueId: '89' }),
    ).toBe(COPY.failed.saved.feed('AEG'));
    expect(stillSavedLine({ ...base, extractionStrategy: 'manual' })).toBe(
      COPY.failed.saved.page,
    );
  });
});
