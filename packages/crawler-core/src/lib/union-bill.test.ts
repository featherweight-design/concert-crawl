import { describe, expect, it } from 'vitest';
import { canonicalizeSupporting } from '@concert-crawl/types';
import { type Bill, changedBillFields, unionBill } from './union-bill.js';

const bill = (
  headliners: string[] | null,
  supportingArtists: string[] | null,
): Bill => ({
  headliners,
  supportingArtists,
  canonicalHeadliners:
    headliners === null ? null : canonicalizeSupporting(headliners),
  canonicalSupporting:
    supportingArtists === null
      ? null
      : canonicalizeSupporting(supportingArtists),
});

describe('unionBill: folding duplicate nights keeps every donor-only name', () => {
  it('keeps a supporting act only the donor names', () => {
    expect(
      unionBill(bill(['Rossi'], ['Opener']), [bill(['Rossi'], ['Late Add'])]),
    ).toEqual(bill(['Rossi'], ['Opener', 'Late Add']));
  });

  it('keeps a headliner only the donor names, after the keeper’s own', () => {
    expect(
      unionBill(bill(['Rossi'], []), [bill(['Co Star', 'Rossi'], [])]),
    ).toEqual(bill(['Rossi', 'Co Star'], []));
  });

  it('does not add a name the keeper already has in another case, accent or spacing', () => {
    expect(
      unionBill(bill(['Rossi'], ['The Openers', 'Beyoncé']), [
        bill(['ROSSI'], ['the  openers', 'Beyonce']),
      ]),
    ).toBeNull();
  });

  it('does not add a donor support who is already a keeper headliner', () => {
    expect(
      unionBill(bill(['Rossi', 'Beck'], []), [bill(['Rossi'], ['Beck'])]),
    ).toBeNull();
  });

  it('keeps the keeper’s roles, and takes donor headliners before donor supports', () => {
    expect(
      unionBill(bill(['Rossi'], ['Beck']), [
        bill(['Rossi'], ['New Act']),
        bill(['Beck', 'New Act'], []),
      ]),
    ).toEqual(bill(['Rossi', 'New Act'], ['Beck']));
  });

  it('fills a NULL bill from the donors, and leaves NULL where every row is NULL', () => {
    expect(unionBill(bill(null, null), [bill(['Rossi'], null)])).toEqual(
      bill(['Rossi'], null),
    );
    expect(unionBill(bill(null, null), [bill(null, null)])).toBeNull();
  });

  it('leaves a closed "nobody billed" bill (empty headliners) alone, supports included', () => {
    expect(
      unionBill(bill([], null), [bill(['Tribute Band'], ['Opener'])]),
    ).toBeNull();
    expect(
      unionBill(bill([], []), [bill(['Tribute Band'], ['Opener'])]),
    ).toBeNull();
  });

  it('still unions into a NULL-headliner keeper that holds supports', () => {
    expect(unionBill(bill(null, ['Opener']), [bill(['Rossi'], null)])).toEqual(
      bill(['Rossi'], ['Opener']),
    );
  });

  it('takes no names from a donor hidden from consumers', () => {
    expect(
      unionBill(bill(['Rossi'], ['Opener']), [
        { ...bill(['Holiday Party'], ['Staff DJ']), hiddenFromConsumer: true },
      ]),
    ).toBeNull();
    expect(
      unionBill(bill(['Rossi'], []), [
        { ...bill(['Hidden Act'], []), hiddenFromConsumer: true },
        { ...bill(['Co Star'], []), hiddenFromConsumer: false },
      ]),
    ).toEqual(bill(['Rossi', 'Co Star'], []));
  });

  it('writes the canonical arrays the way the crawl does', () => {
    const result = unionBill(bill(['Zeta'], []), [bill(['Álpha'], ['Opener'])]);
    expect(result?.canonicalHeadliners).toEqual(
      canonicalizeSupporting(['Zeta', 'Álpha']),
    );
    expect(result?.canonicalSupporting).toEqual(['opener']);
  });
});

describe('changedBillFields: the fill reports the arrays the union changed', () => {
  it('reports supports alone when only supports were added', () => {
    const keeper = bill(['Rossi'], ['Opener']);
    const next = unionBill(keeper, [bill(['Rossi'], ['Late Add'])]);
    expect(next).not.toBeNull();
    expect(next && changedBillFields(keeper, next)).toEqual([
      'supportingArtists',
    ]);
  });

  it('reports headliners alone, or both, as changed', () => {
    const keeper = bill(['Rossi'], ['Opener']);
    expect(
      changedBillFields(keeper, bill(['Rossi', 'Co Star'], ['Opener'])),
    ).toEqual(['headliners']);
    expect(
      changedBillFields(keeper, bill(['Rossi', 'Co Star'], ['Opener', 'X'])),
    ).toEqual(['headliners', 'supportingArtists']);
    expect(changedBillFields(keeper, keeper)).toEqual([]);
  });
});
