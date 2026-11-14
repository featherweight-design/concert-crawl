// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import type { SubmittedRow } from '@/components/admin/prices/submitted-api';
import { NeedsYouClient } from './NeedsYouClient';

const { getTokenMock, replaceMock, mockList } = vi.hoisted(() => ({
  getTokenMock: async () => 'token',
  replaceMock: vi.fn(),
  mockList:
    vi.fn<
      (
        filter: string,
        search: string,
        offset: number,
        limit: number,
      ) => Promise<{ rows: SubmittedRow[]; total: number }>
    >(),
}));

vi.mock('@/components/admin/prices/submitted-api', () => ({
  submittedApi: () => ({ list: mockList }),
}));

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: getTokenMock }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

const answer = (over: Record<string, unknown>) => ({
  slug: 'still_on',
  label: 'Still on',
  notifiesFans: false,
  undoable: true,
  suggested: false,
  ...over,
});

const item = (over: Record<string, unknown>) => ({
  key: 'show-dropped:e1',
  kind: 'show-dropped',
  title: 'Olive Jones w/ Zoe Stroupe',
  venueId: 'v1',
  venueName: 'Globe Hall',
  fanDate: '2099-01-01',
  watchers: 12,
  answers: [
    answer({
      slug: 'postponed',
      label: 'Postponed',
      notifiesFans: true,
      undoable: false,
    }),
    answer({
      slug: 'cancelled',
      label: 'Cancelled',
      notifiesFans: true,
      undoable: false,
    }),
    answer({}),
  ],
  evidence: [{ label: 'Last seen', value: 'Nov 7' }],
  ...over,
});

const ITEMS = [
  item({}),
  item({
    key: 'bug:f1',
    kind: 'bug',
    title: 'The map will not load',
    venueId: null,
    venueName: null,
    fanDate: null,
    watchers: 0,
    answers: [answer({ slug: 'dismiss', label: 'Dismiss' })],
    evidence: [],
  }),
];

const COUNT = {
  decisions: 2,
  handledToday: 6,
  byKind: {
    'show-dropped': 1,
    'show-moved': 0,
    'venue-failing': 0,
    'venue-blocked': 0,
    artist: 0,
    'event-low-confidence': 0,
    'price-check': 0,
    'price-batch': 0,
    bug: 1,
  },
};

const json = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

let calls: { url: string; method: string; body: unknown }[] = [];

beforeEach(() => {
  calls = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(init.body) : undefined,
      });
      if (url.endsWith('/needs-you/count')) return json(COUNT);
      if (url.endsWith('/answer')) {
        // As the API answers: a quiet answer can be undone, a notifying one can't.
        const quiet = init?.body?.includes('still_on') === true;
        return json({
          key: 'show-dropped:e1',
          slug: 'still_on',
          auditId: 'audit-1',
          undoable: quiet,
        });
      }
      if (url.endsWith('/undo')) return json({ ok: true });
      if (url.endsWith('/snooze')) return json({ ok: true });
      return json(ITEMS);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('NeedsYouClient', () => {
  it('counts each pill from the server counts and the summary line', async () => {
    render(<NeedsYouClient item={null} />);
    await screen.findAllByTestId('needs-you-item');
    expect(
      screen.getByText(
        /2 decisions\. Soonest for fans first\. 6 handled today\./,
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('tab', { name: /^Shows/ })).getByText('1'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('tab', { name: /^Bugs/ })).getByText('1'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('tab', { name: /^Venues/ })).getByText('0'),
    ).toBeInTheDocument();
  });

  it('filters the list by kind', async () => {
    render(<NeedsYouClient item={null} />);
    await screen.findAllByTestId('needs-you-item');
    fireEvent.click(screen.getByRole('tab', { name: /^Bugs/ }));
    expect(screen.getAllByTestId('needs-you-item')).toHaveLength(1);
    expect(screen.getByText('The map will not load')).toBeInTheDocument();
  });

  it('answers a quiet answer, leaves an Undo line, and Undo takes it back', async () => {
    render(<NeedsYouClient item={null} />);
    await screen.findAllByTestId('needs-you-item');
    const card = screen.getAllByTestId('needs-you-item')[0] as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Still on' }));
    const line = await screen.findByTestId('needs-you-answered');
    expect(line).toHaveTextContent('Olive Jones marked Still on.');
    expect(screen.getAllByTestId('needs-you-item')).toHaveLength(1);
    expect(calls.find((call) => call.url.endsWith('/answer'))?.body).toEqual({
      answer: 'still_on',
    });

    fireEvent.click(within(line).getByRole('button', { name: 'Undo' }));
    await waitFor(() =>
      expect(
        calls.some((call) => call.url.endsWith('/answers/audit-1/undo')),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(screen.queryByTestId('needs-you-answered')).toBeNull(),
    );
  });

  it('asks before an answer that tells fans, and leaves no Undo', async () => {
    render(<NeedsYouClient item={null} />);
    await screen.findAllByTestId('needs-you-item');
    const card = screen.getAllByTestId('needs-you-item')[0] as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: 'Postponed' }));
    expect(calls.some((call) => call.url.endsWith('/answer'))).toBe(false);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Postponed?');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Postponed' }));
    await waitFor(() =>
      expect(calls.some((call) => call.url.endsWith('/answer'))).toBe(true),
    );
    const line = await screen.findByTestId('needs-you-answered');
    expect(within(line).queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('opens the Pause panel from Keep paused... and sends its body with the answer', async () => {
    const venue = item({
      key: 'venue-failing:v1',
      kind: 'venue-failing',
      title: 'Globe Hall stopped crawling after 3 failures',
      fanDate: null,
      watchers: 0,
      showCount: 14,
      answers: [
        answer({
          slug: 're_crawl_now',
          label: 'Re-crawl now',
          suggested: true,
        }),
        answer({ slug: 'keep_paused', label: 'Keep paused...' }),
      ],
      evidence: [],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        calls.push({
          url,
          method: init?.method ?? 'GET',
          body: init?.body ? JSON.parse(init.body) : undefined,
        });
        if (url.endsWith('/needs-you/count'))
          return json({
            ...COUNT,
            decisions: 1,
            byKind: { ...COUNT.byKind, 'show-dropped': 0, bug: 0 },
          });
        if (url.endsWith('/answer'))
          return json({
            key: 'venue-failing:v1',
            slug: 'keep_paused',
            auditId: 'audit-p',
            undoable: false,
          });
        return json([venue]);
      }),
    );
    render(<NeedsYouClient item={null} />);
    const card = (await screen.findAllByTestId('needs-you-item'))[0];
    fireEvent.click(
      within(card as HTMLElement).getByRole('button', {
        name: 'Keep paused...',
      }),
    );
    // The panel asks first: nothing has gone to the API yet.
    const dialog = await screen.findByRole('dialog');
    expect(calls.some((call) => call.url.endsWith('/answer'))).toBe(false);
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Pause crawling' }),
    );
    await waitFor(() =>
      expect(calls.some((call) => call.url.endsWith('/answer'))).toBe(true),
    );
    const sent = calls.find((call) => call.url.endsWith('/answer'))?.body;
    expect(sent).toMatchObject({
      answer: 'keep_paused',
      reason: expect.any(String),
      resume: expect.objectContaining({ mode: expect.any(String) }),
    });
    expect(await screen.findByTestId('needs-you-answered')).toHaveTextContent(
      'marked Keep paused.',
    );
  });

  it('snoozing a card takes it off the list without an Undo', async () => {
    render(<NeedsYouClient item={null} />);
    await screen.findAllByTestId('needs-you-item');
    const card = screen.getAllByTestId('needs-you-item')[0] as HTMLElement;
    fireEvent.click(within(card).getByTestId('snooze-trigger'));
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /Snooze 1 day/ }),
    );
    const line = await screen.findByTestId('needs-you-answered');
    expect(line).toHaveTextContent('Olive Jones snoozed.');
    expect(within(line).queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(screen.getAllByTestId('needs-you-item')).toHaveLength(1);
    const snooze = calls.find((call) => call.url.endsWith('/snooze'));
    expect(snooze?.body).toMatchObject({
      until: expect.stringMatching(/T08:00:00-0[67]:00$/),
    });
  });

  it('opens the price batch sheet on the phone and approves exactly the ticked ids', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const batch = item({
      key: 'price-batch:b1',
      kind: 'price-batch',
      title: '2 new prices',
      venueId: null,
      venueName: null,
      fanDate: null,
      watchers: 0,
      submissionIds: ['s1', 's2'],
      answers: [
        answer({ slug: 'approve_all', label: 'Approve all', suggested: true }),
        answer({ slug: 'review', label: 'Review', undoable: false }),
      ],
      evidence: [],
    });
    const submission = (id: string, title: string): SubmittedRow => ({
      id,
      eventId: `e-${id}`,
      title,
      venueName: 'Globe Hall',
      date: '2099-01-01',
      priceMin: '30',
      priceMax: null,
      handle: 'fan',
      backedBy: 2,
      state: 'waiting',
      ticketUrl: null,
    });
    mockList.mockResolvedValue({
      rows: [submission('s1', 'One'), submission('s2', 'Two')],
      total: 2,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
        calls.push({
          url,
          method: init?.method ?? 'GET',
          body: init?.body ? JSON.parse(init.body) : undefined,
        });
        if (url.endsWith('/needs-you/count')) return json(COUNT);
        if (url.endsWith('/answer'))
          return json({
            key: 'price-batch:b1',
            slug: 'approve_all',
            auditId: 'audit-9',
            undoable: true,
          });
        return json([batch]);
      }),
    );
    render(<NeedsYouClient item={null} />);
    const card = (await screen.findAllByTestId('needs-you-item'))[0];
    fireEvent.click(
      within(card as HTMLElement).getByRole('button', { name: 'Review' }),
    );
    const sheet = await screen.findByTestId('price-batch-sheet');
    await within(sheet).findByText('One');
    fireEvent.click(
      within(sheet).getByRole('checkbox', { name: 'Approve Two' }),
    );
    // The footer sits beside the list box, not inside it.
    fireEvent.click(screen.getByRole('button', { name: 'Approve 1' }));
    await waitFor(() =>
      expect(calls.find((call) => call.url.endsWith('/answer'))?.body).toEqual({
        submissionIds: ['s1'],
        answer: 'approve_all',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByTestId('price-batch-sheet')).toBeNull(),
    );
  });

  it('says All clear when the queue is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/needs-you/count')
          ? json({
              ...COUNT,
              decisions: 0,
              byKind: { ...COUNT.byKind, 'show-dropped': 0, bug: 0 },
            })
          : json([]),
      ),
    );
    render(<NeedsYouClient item={null} />);
    expect(
      await screen.findByTestId('needs-you-all-clear'),
    ).toBeInTheDocument();
  });

  it('draws the facts card under All clear, leaving out rows it has no number for', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/needs-you/count'))
          return json({
            ...COUNT,
            decisions: 0,
            byKind: { ...COUNT.byKind, 'show-dropped': 0, bug: 0 },
          });
        if (url.endsWith('/needs-you/facts'))
          return json({
            lastCrawl: { ok: 20, total: 21, at: '2026-11-13T09:08:00.000Z' },
            nextCrawlAt: '2099-01-01T09:07:00.000Z',
            snoozedVenues: 0,
          });
        return json([]);
      }),
    );
    render(<NeedsYouClient item={null} />);
    const facts = await screen.findByTestId('needs-you-facts');
    expect(facts).toHaveTextContent("Last night's crawl20 of 21 OK");
    expect(facts).toHaveTextContent(/Next crawlTonight, 2:07 AM/);
    // Nothing snoozed: no "Snoozed" row.
    expect(facts).not.toHaveTextContent('Snoozed');
  });

  it('leaves out Next crawl where no daily crawl runs (null outside production)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/needs-you/count'))
          return json({
            ...COUNT,
            decisions: 0,
            byKind: { ...COUNT.byKind, 'show-dropped': 0, bug: 0 },
          });
        if (url.endsWith('/needs-you/facts'))
          return json({
            lastCrawl: { ok: 20, total: 21, at: '2026-11-13T09:08:00.000Z' },
            nextCrawlAt: null,
            snoozedVenues: 0,
          });
        return json([]);
      }),
    );
    render(<NeedsYouClient item={null} />);
    const facts = await screen.findByTestId('needs-you-facts');
    expect(facts).toHaveTextContent("Last night's crawl20 of 21 OK");
    expect(facts).not.toHaveTextContent('Next crawl');
  });

  it('keeps the skeleton up while the queue loads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    render(<NeedsYouClient item={null} />);
    expect(screen.getByTestId('needs-you-skeleton')).toBeInTheDocument();
  });

  it('opens the first item on desktop, once, and leaves it shut after a close', async () => {
    render(<NeedsYouClient item={null} />);
    const panel = await screen.findByTestId('side-panel');
    expect(panel).toHaveTextContent(
      'Olive Jones dropped off Globe Hall’s calendar',
    );
    expect(replaceMock).toHaveBeenCalledWith(
      '/admin/needs-you?item=show-dropped%3Ae1',
      { scroll: false },
    );
    fireEvent.click(within(panel).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByTestId('side-panel')).toBeNull());
  });

  it('keeps the list on the phone until an item is picked', async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<NeedsYouClient item={null} />);
    await screen.findAllByTestId('needs-you-item');
    expect(screen.queryByTestId('side-panel')).toBeNull();
  });

  it('shows Couldn’t load with Try again when the list fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    );
    render(<NeedsYouClient item={null} />);
    expect(await screen.findByTestId('couldnt-load')).toBeInTheDocument();
  });
});
