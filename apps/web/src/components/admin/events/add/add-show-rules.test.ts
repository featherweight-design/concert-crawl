import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_DRAFT,
  addAct,
  addActWithRole,
  lineupEntries,
  moveAct,
  moveActKeepingRoles,
  removeAct,
  rolesOf,
  toBody,
  todayInDenver,
  validateDraft,
  type Act,
  type AddShowDraft,
} from './add-show-rules';

const TODAY = '2026-11-20';
const VALID: AddShowDraft = {
  title: 'Kaleo',
  venueId: '0b9c4f3e-1d2a-4c5b-8e7f-a1b2c3d4e5f6',
  date: '2026-12-04',
  doorsTime: '19:00',
  showTime: '20:00',
  ticketUrl: 'https://axs.com/events/kaleo',
  lineup: [{ name: 'Kaleo', artistId: 'a1' }, { name: 'The Band of Heathens' }],
};

describe('validateDraft', () => {
  it('passes a complete draft', () => {
    expect(validateDraft(VALID, TODAY)).toEqual({});
  });

  it('names every empty required field', () => {
    expect(validateDraft(EMPTY_DRAFT, TODAY)).toEqual({
      title: 'title_required',
      venueId: 'venue_required',
      date: 'date_required',
      lineup: 'headliner_required',
    });
  });

  it('refuses a passed date but takes today', () => {
    expect(validateDraft({ ...VALID, date: '2026-11-19' }, TODAY).date).toBe(
      'date_past',
    );
    expect(
      validateDraft({ ...VALID, date: TODAY }, TODAY).date,
    ).toBeUndefined();
  });

  it('puts a show before doors under Show', () => {
    expect(
      validateDraft({ ...VALID, doorsTime: '20:00', showTime: '19:00' }, TODAY),
    ).toEqual({ showTime: 'show_before_doors' });
  });

  it('reads 20:00 and 20:00:00 as the same time, as the API does', () => {
    expect(
      validateDraft(
        { ...VALID, doorsTime: '20:00:00', showTime: '20:00' },
        TODAY,
      ).showTime,
    ).toBeUndefined();
    expect(
      validateDraft(
        { ...VALID, doorsTime: '20:00', showTime: '19:59:59' },
        TODAY,
      ).showTime,
    ).toBe('show_before_doors');
  });

  it('wants a full link, and takes none', () => {
    expect(
      validateDraft({ ...VALID, ticketUrl: 'axs.com/events/kaleo' }, TODAY)
        .ticketUrl,
    ).toBe('ticket_url_invalid');
    expect(
      validateDraft({ ...VALID, ticketUrl: '  ' }, TODAY).ticketUrl,
    ).toBeUndefined();
  });

  it('caps the title at 300', () => {
    expect(
      validateDraft({ ...VALID, title: 'x'.repeat(301) }, TODAY).title,
    ).toBe('title_too_long');
  });

  it('refuses a day the calendar does not have, as the API does', () => {
    expect(validateDraft({ ...VALID, date: '2026-02-30' }, TODAY).date).toBe(
      'date_required',
    );
    expect(validateDraft({ ...VALID, date: '2026-13-01' }, TODAY).date).toBe(
      'date_required',
    );
    expect(validateDraft({ ...VALID, date: '2028-02-29' }, TODAY).date).toBe(
      undefined,
    );
  });

  it('caps an act name at 200', () => {
    const at = (name: string) =>
      validateDraft({ ...VALID, lineup: [{ name }] }, TODAY).lineup;
    expect(at('x'.repeat(200))).toBeUndefined();
    expect(at('x'.repeat(201))).toBe('lineup_name_too_long');
  });

  it('refuses a name with no canonical key', () => {
    expect(
      validateDraft({ ...VALID, lineup: [{ name: '́́' }] }, TODAY).lineup,
    ).toBe('lineup_name_invalid');
  });

  it('caps the bill at 50 acts', () => {
    const acts = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ name: `Act ${i}` }));
    expect(
      validateDraft({ ...VALID, lineup: acts(50) }, TODAY).lineup,
    ).toBeUndefined();
    expect(validateDraft({ ...VALID, lineup: acts(51) }, TODAY).lineup).toBe(
      'lineup_too_long',
    );
  });

  it('caps the ticket link at 2048', () => {
    const base = 'https://axs.com/';
    const link = (length: number) =>
      validateDraft(
        { ...VALID, ticketUrl: base + 'x'.repeat(length - base.length) },
        TODAY,
      ).ticketUrl;
    expect(link(2048)).toBeUndefined();
    expect(link(2049)).toBe('ticket_url_invalid');
  });
});

describe('todayInDenver', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is Denver's day on an evening when UTC is already tomorrow", () => {
    vi.useFakeTimers();
    // 8:30 PM MST on 2026-11-20 is 03:30 UTC on 2026-11-21.
    vi.setSystemTime(new Date('2026-11-21T03:30:00Z'));
    expect(todayInDenver()).toBe('2026-11-20');
  });
});

describe('toBody', () => {
  it('makes the first act the headliner and keeps picked artists linked', () => {
    expect(toBody({ ...VALID, title: ' Kaleo ', ticketUrl: '' })).toEqual({
      venueId: VALID.venueId,
      date: '2026-12-04',
      title: 'Kaleo',
      doorsTime: '19:00',
      showTime: '20:00',
      ticketUrl: null,
      lineup: [
        { name: 'Kaleo', role: 'headliner', artistId: 'a1' },
        { name: 'The Band of Heathens', role: 'support' },
      ],
    });
  });
});

describe('the bill', () => {
  const bill = [{ name: 'One' }, { name: 'Two' }, { name: 'Three' }];

  it('adds a name once, trimmed, and never a blank', () => {
    expect(addAct(bill, { name: ' Four ' }).at(-1)).toEqual({ name: 'Four' });
    expect(addAct(bill, { name: 'two' })).toEqual(bill);
    expect(addAct(bill, { name: '  ' })).toEqual(bill);
  });

  it('dedupes as the API bills: by canonical key, not just case', () => {
    const acts = [{ name: 'Beyoncé' }, { name: 'Earl Sweatshirt' }];
    expect(addAct(acts, { name: 'beyonce' })).toEqual(acts);
    expect(addAct(acts, { name: 'Earl  Sweatshirt & MIKE' })).toEqual(acts);
    expect(addAct(acts, { name: 'MIKE' }).at(-1)).toEqual({ name: 'MIKE' });
  });

  it('removes an act', () => {
    expect(removeAct(bill, 0).map((act) => act.name)).toEqual(['Two', 'Three']);
  });

  it('moves an act, and a move off either end does nothing', () => {
    expect(moveAct(bill, 2, 0).map((act) => act.name)).toEqual([
      'Three',
      'One',
      'Two',
    ]);
    expect(moveAct(bill, 0, -1)).toEqual(bill);
    expect(moveAct(bill, 2, 3)).toEqual(bill);
  });

  it('ignores a move from off either end', () => {
    expect(moveAct(bill, -1, 0)).toEqual(bill);
    expect(moveAct(bill, 3, 0)).toEqual(bill);
  });
});

// Event edit's bills carry their saved roles; Add a show's carry none.
describe('rolesOf and lineupEntries', () => {
  const crawled: Act[] = [
    { name: 'A', role: 'headliner', artistId: 'a1' },
    { name: 'B', role: 'headliner' },
    { name: 'C', role: 'support', artistId: 'c1', unsure: true, slug: 'c' },
  ];

  it('keeps every headliner on a crawled bill, links and order too', () => {
    expect(lineupEntries(crawled)).toEqual([
      { name: 'A', role: 'headliner', artistId: 'a1' },
      { name: 'B', role: 'headliner' },
      { name: 'C', role: 'support', artistId: 'c1' },
    ]);
  });

  it('reads no roles as Add a show does: the first headlines', () => {
    expect(rolesOf([{ name: 'A' }, { name: 'B' }])).toEqual([
      'headliner',
      'support',
    ]);
  });

  it('keeps a stored headliner that does not lead the bill', () => {
    const late: Act[] = [
      { name: 'A', role: 'headliner' },
      { name: 'C', role: 'support' },
      { name: 'B', role: 'headliner' },
    ];
    expect(rolesOf(late)).toEqual(['headliner', 'support', 'headliner']);
  });

  it('heads the bill with an act moved to the front, and touches no other role', () => {
    expect(rolesOf(moveActKeepingRoles(crawled, 2, 0))).toEqual([
      'headliner',
      'headliner',
      'headliner',
    ]);
  });

  it('keeps a moved act’s role anywhere but the front', () => {
    expect(rolesOf(moveActKeepingRoles(crawled, 1, 2))).toEqual([
      'headliner',
      'support',
      'headliner',
    ]);
    expect(rolesOf(moveActKeepingRoles(crawled, 0, 2))).toEqual([
      'headliner',
      'support',
      'headliner',
    ]);
  });

  it('pins positional roles before a move, so an unset act never shifts', () => {
    const added = addActWithRole(crawled, { name: 'D' });
    expect(added[3]?.role).toBe('support');
    expect(
      rolesOf(moveActKeepingRoles([{ name: 'X' }, { name: 'Y' }], 1, 0)),
    ).toEqual(['headliner', 'headliner']);
    expect(rolesOf(removeAct(crawled, 0))).toEqual(['headliner', 'support']);
  });
});
