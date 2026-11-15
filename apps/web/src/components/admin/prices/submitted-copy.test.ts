import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';

const COPY = ADMIN_COPY.pricesSubmitted.reject;

describe('the reject dialog body', () => {
  it("names the submitter's handle, as the board draws it", () => {
    expect(COPY.body('dlo')).toBe(
      "The price comes off the show. @dlo sees it as closed in Submitted prices: “We didn't use this price.”",
    );
  });

  it('falls back to "The fan" only when the submitter has no handle', () => {
    expect(COPY.body(null)).toBe(
      "The price comes off the show. The fan sees it as closed in Submitted prices: “We didn't use this price.”",
    );
  });
});

describe('Approve (43/approve-*)', () => {
  const MENU = ADMIN_COPY.pricesSubmitted.menu;
  const APPROVE = ADMIN_COPY.pricesSubmitted.approve;

  it('counts the backers in the menu hint, singular as drawn and plural', () => {
    expect(MENU.approve.hint('$68–$75', 1)).toBe(
      'Publishes $68–$75 to fans now. 1 fan backs it.',
    );
    expect(MENU.approve.hint('$44', 3)).toBe(
      'Publishes $44 to fans now. 3 fans back it.',
    );
  });

  it('drops the backer sentence on the phone', () => {
    expect(MENU.approve.phoneHint('$68–$75')).toBe(
      'Publishes $68–$75 to fans now.',
    );
  });

  it('names the show and venue, and titles the phone sheet show · price', () => {
    expect(MENU.openShow.hint('FKJ', 'Mission Ballroom')).toBe(
      'FKJ · Mission Ballroom',
    );
    expect(MENU.openShow.hint('FKJ', null)).toBe('FKJ');
    expect(MENU.sheetTitle('FKJ', '$68–$75')).toBe('FKJ · $68–$75');
  });

  it('says what went live in the toast', () => {
    expect(APPROVE.doneTitle('$68–$75', 'FKJ')).toBe(
      'Approved. $68–$75 is live on FKJ.',
    );
  });
});
