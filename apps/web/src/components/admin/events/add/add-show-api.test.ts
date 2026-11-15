import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const adminFetch = vi.fn();
vi.mock('@/lib/api', () => ({
  adminFetch: (...args: unknown[]) => adminFetch(...args),
}));

import {
  AddShowTimeoutError,
  addShowApi,
  type DuplicateShow,
} from './add-show-api';
import { toBody, type AddShowDraft } from './add-show-rules';

const reply = (status: number, body: unknown) =>
  ({ status, json: async () => body }) satisfies Pick<
    Response,
    'status' | 'json'
  >;

const api = addShowApi(async () => 'token');
const DRAFT: AddShowDraft = {
  title: 'Kaleo',
  venueId: 'v1',
  date: '2026-12-04',
  doorsTime: null,
  showTime: null,
  ticketUrl: '',
  lineup: [{ name: 'Kaleo' }],
};

// A block body on purpose: `mockReset()` returns the mock, and a function a
// beforeEach returns is run by Vitest as that test's cleanup, with no
// arguments. That calls adminFetch again after every test, and a test whose
// mock rejects or reads its `init` then fails in the cleanup.
beforeEach(() => {
  adminFetch.mockReset();
});

describe('addShowApi.create', () => {
  it('returns the new show on a 201', async () => {
    adminFetch.mockResolvedValue(
      reply(201, { success: true, data: { id: 'e1', title: 'Kaleo' } }),
    );
    await expect(api.create(toBody(DRAFT))).resolves.toEqual({
      kind: 'created',
      id: 'e1',
    });
    const [url, init] = adminFetch.mock.calls[0] ?? [];
    expect(url).toMatch(/\/v1\/admin\/events$/);
    expect(init).toMatchObject({ method: 'POST' });
  });

  it('maps a 400 to its fields, by the first path segment', async () => {
    adminFetch.mockResolvedValue(
      reply(400, {
        success: false,
        error: {
          name: 'ZodError',
          issues: [
            { code: 'custom', path: ['date'], message: 'date_past' },
            {
              code: 'custom',
              path: ['lineup', 0, 'name'],
              message: 'lineup_name_invalid',
            },
            { code: 'custom', path: ['title'], message: 'not_a_code' },
          ],
        },
      }),
    );
    await expect(api.create(toBody(DRAFT))).resolves.toEqual({
      kind: 'invalid',
      issues: [
        { field: 'date', code: 'date_past' },
        { field: 'lineup', code: 'lineup_name_invalid' },
      ],
    });
  });

  it('returns the existing show on the exact-key 409', async () => {
    adminFetch.mockResolvedValue(
      reply(409, { success: false, error: 'duplicate_show', existingId: 'e9' }),
    );
    await expect(api.create(toBody(DRAFT))).resolves.toEqual({
      kind: 'duplicate',
      existingId: 'e9',
    });
  });

  it('throws on anything else, for Save failed', async () => {
    adminFetch.mockResolvedValue(reply(500, { success: false, error: 'boom' }));
    await expect(api.create(toBody(DRAFT))).rejects.toThrow();
    adminFetch.mockResolvedValue(reply(201, { success: true, data: {} }));
    await expect(api.create(toBody(DRAFT))).rejects.toThrow();
  });

  it('returns a form-level refusal for a 400 with no known code', async () => {
    adminFetch.mockResolvedValue(
      reply(400, {
        success: false,
        error: {
          name: 'ZodError',
          issues: [
            {
              code: 'invalid_format',
              path: ['lineup', 0, 'artistId'],
              message: 'Invalid GUID',
            },
          ],
        },
      }),
    );
    await expect(api.create(toBody(DRAFT))).resolves.toEqual({
      kind: 'invalid',
      issues: [],
    });
  });

  it('throws on a malformed 409, for Save failed', async () => {
    adminFetch.mockResolvedValue(
      reply(409, { success: false, error: 'duplicate_show' }),
    );
    await expect(api.create(toBody(DRAFT))).rejects.toThrow();
  });

  it('throws without a token, and sends nothing', async () => {
    const noToken = addShowApi(async () => null);
    await expect(noToken.create(toBody(DRAFT))).rejects.toThrow('no token');
    expect(adminFetch).not.toHaveBeenCalled();
  });

  describe('when the request times out', () => {
    afterEach(() => vi.restoreAllMocks());

    const fireTimeout = () =>
      vi
        .spyOn(AbortSignal, 'timeout')
        .mockReturnValue(
          AbortSignal.abort(new DOMException('timed out', 'TimeoutError')),
        );
    const rejectWithSignal = () =>
      adminFetch.mockImplementation(
        async (_url: unknown, init: { signal: AbortSignal }) => {
          throw init.signal.reason;
        },
      );

    it('returns timeout, not a failure, since the POST may have saved', async () => {
      fireTimeout();
      rejectWithSignal();
      await expect(api.create(toBody(DRAFT))).resolves.toEqual({
        kind: 'timeout',
      });
    });

    it('returns timeout when the clock fires while the body is read', async () => {
      fireTimeout();
      adminFetch.mockImplementation(
        async (_url: unknown, init: { signal: AbortSignal }) => ({
          status: 201,
          json: async () => {
            throw init.signal.reason;
          },
        }),
      );
      await expect(api.create(toBody(DRAFT))).resolves.toEqual({
        kind: 'timeout',
      });
    });

    it('keeps a caller abort as an abort, never a timeout', async () => {
      fireTimeout();
      rejectWithSignal();
      const caller = new AbortController();
      caller.abort(new DOMException('newer keystroke', 'AbortError'));
      const failure = await api
        .artists('kal', caller.signal)
        .catch((err: unknown) => err);
      expect(failure).not.toBeInstanceOf(AddShowTimeoutError);
      expect(failure).toMatchObject({ name: 'AbortError' });
    });

    it('still throws on any other failure', async () => {
      adminFetch.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(api.create(toBody(DRAFT))).rejects.toThrow(
        'Failed to fetch',
      );
    });
  });
});

describe('addShowApi.findCreated', () => {
  const body = toBody({ ...DRAFT, showTime: '20:00' });
  const row = (over: Partial<DuplicateShow>): DuplicateShow => ({
    id: 'e1',
    title: 'Kaleo',
    showTime: '20:00:00',
    manual: true,
    hidden: false,
    ...over,
  });
  const duplicates = (rows: DuplicateShow[]) =>
    adminFetch.mockResolvedValue(
      reply(200, { success: true, data: { duplicates: rows } }),
    );

  const none: ReadonlySet<string> = new Set();

  it('finds the show the timed-out POST saved, by venue, date and title', async () => {
    duplicates([row({ id: 'e2', title: 'Kaleo Live' }), row({ id: 'e1' })]);
    await expect(api.findCreated(body, none)).resolves.toBe('e1');
    expect(String(adminFetch.mock.calls[0]?.[0])).toContain(
      '/v1/admin/events/duplicate?venueId=v1&date=2026-12-04&title=Kaleo',
    );
  });

  it('never returns an older manual twin, only the new show', async () => {
    duplicates([row({ id: 'old', title: 'Open Mic' })]);
    const before = await api.manualIdsBefore({ ...body, title: 'Open Mic' });
    expect([...before]).toEqual(['old']);
    const openMic = { ...body, title: 'Open Mic' };
    await expect(api.findCreated(openMic, before)).resolves.toBeNull();
    duplicates([
      row({ id: 'old', title: 'Open Mic' }),
      row({ id: 'new', title: 'Open Mic' }),
    ]);
    await expect(api.findCreated(openMic, before)).resolves.toBe('new');
  });

  it('records only manual shows as the before set', async () => {
    duplicates([row({ id: 'e1' }), row({ id: 'c1', manual: false })]);
    expect([...(await api.manualIdsBefore(body))]).toEqual(['e1']);
  });

  it('is null for a crawled show, another time, none or two', async () => {
    duplicates([row({ manual: false })]);
    await expect(api.findCreated(body, none)).resolves.toBeNull();
    duplicates([row({ showTime: null })]);
    await expect(api.findCreated(body, none)).resolves.toBeNull();
    duplicates([]);
    await expect(api.findCreated(body, none)).resolves.toBeNull();
    duplicates([row({ id: 'e1' }), row({ id: 'e3' })]);
    await expect(api.findCreated(body, none)).resolves.toBeNull();
  });
});

describe('addShowApi reads', () => {
  it('reads the duplicates', async () => {
    const duplicates = [
      {
        id: 'e2',
        title: 'KALEO',
        showTime: null,
        manual: false,
        hidden: false,
      },
    ];
    adminFetch.mockResolvedValue(
      reply(200, { success: true, data: { duplicates } }),
    );
    await expect(
      api.duplicates({ venueId: 'v1', date: '2026-12-04', title: 'Kaleo' }),
    ).resolves.toEqual(duplicates);
    expect(String(adminFetch.mock.calls[0]?.[0])).toContain(
      '/v1/admin/events/duplicate?venueId=v1&date=2026-12-04&title=Kaleo',
    );
  });

  it('drops not-an-artist rows from the suggestions', async () => {
    adminFetch.mockResolvedValue(
      reply(200, {
        success: true,
        data: [
          { id: 'a1', name: 'Kaleo', matchStatus: 'matched' },
          { id: 'a2', name: 'Kaleo Live', matchStatus: 'not_an_artist' },
        ],
      }),
    );
    await expect(api.artists('kal')).resolves.toEqual([
      { id: 'a1', name: 'Kaleo' },
    ]);
  });

  it('asks for 12 and shows six, so dropped rows leave the list full', async () => {
    adminFetch.mockResolvedValue(
      reply(200, {
        success: true,
        data: Array.from({ length: 12 }, (_, i) => ({
          id: `a${i}`,
          name: `Act ${i}`,
          matchStatus: i < 3 ? 'not_an_artist' : 'matched',
        })),
      }),
    );
    const shown = await api.artists('act');
    expect(shown.map((artist) => artist.id)).toEqual([
      'a3',
      'a4',
      'a5',
      'a6',
      'a7',
      'a8',
    ]);
    expect(String(adminFetch.mock.calls[0]?.[0])).toContain('limit=12');
  });

  it('asks nothing for a blank search', async () => {
    await expect(api.artists('')).resolves.toEqual([]);
    await expect(api.artists('   ')).resolves.toEqual([]);
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it('fails a drifted venue list', async () => {
    adminFetch.mockResolvedValue(
      reply(200, { success: true, data: [{ id: 'v1' }] }),
    );
    await expect(api.venues()).rejects.toThrow();
  });
});
