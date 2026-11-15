import { describe, expect, it } from 'vitest';
import {
  EMPTY_DRAFT,
  addAct,
  moveAct,
  removeAct,
  toBody,
  validateDraft,
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
});
