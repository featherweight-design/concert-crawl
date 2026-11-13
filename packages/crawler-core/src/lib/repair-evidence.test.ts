import { describe, expect, it } from 'vitest';
import { classifyBillChange } from './repair-evidence.js';

const verdict = (
  stored: { h: string[] | null; s?: string[] | null },
  next: { h: string[]; s?: string[] },
  tribute = false,
) =>
  classifyBillChange({
    stored: { headliners: stored.h, supporting: stored.s ?? null },
    next: { headliners: next.h, supporting: next.s ?? [] },
    tribute,
  });

describe('classifyBillChange: what the repair may write', () => {
  it('writes a split of a stored joined name', () => {
    expect(
      verdict({ h: ['Clipse & J.I.D'] }, { h: ['Clipse', 'J.I.D'] }),
    ).toEqual({ write: true, kind: 'split' });
  });

  it('writes a split where a part moves to supporting (Galdive & rum.gold)', () => {
    expect(
      verdict(
        { h: ['Galdive & rum.gold'] },
        { h: ['Galdive'], s: ['rum.gold'] },
      ),
    ).toEqual({ write: true, kind: 'split' });
  });

  it('keeps the other stored acts beside a split', () => {
    expect(
      verdict(
        { h: ['Clipse & J.I.D'], s: ['Samara Cyn'] },
        { h: ['Clipse', 'J.I.D'], s: ['Samara Cyn'] },
      ),
    ).toEqual({ write: true, kind: 'split' });
  });

  it('writes a tribute night whatever was stored, even nothing', () => {
    expect(verdict({ h: ["The B-52's"] }, { h: [] }, true)).toEqual({
      write: true,
      kind: 'tribute',
    });
    expect(verdict({ h: null }, { h: [] }, true)).toEqual({
      write: true,
      kind: 'tribute',
    });
  });

  it('writes a repeat removed, and a joined name kept beside its own parts', () => {
    expect(verdict({ h: ['Nas', 'Nas'] }, { h: ['Nas'] })).toEqual({
      write: true,
      kind: 'dedupe',
    });
    expect(
      verdict(
        { h: ['Cypress Hill', 'Method Man', 'Redman', 'Method Man & Redman'] },
        { h: ['Cypress Hill', 'Method Man & Redman'] },
      ),
    ).toEqual({ write: true, kind: 'dedupe' });
  });

  it('refuses to drop a stored headliner (Def Leppard and Goo Goo Dolls, Chicago & Styx)', () => {
    expect(
      verdict({ h: ['Def Leppard', 'Goo Goo Dolls'] }, { h: ['Def Leppard'] }),
    ).toEqual({ write: false, reason: 'would-drop-stored-headliner' });
    expect(verdict({ h: ['Chicago', 'Styx'] }, { h: ['Chicago'] })).toEqual({
      write: false,
      reason: 'would-drop-stored-headliner',
    });
  });

  it('refuses to add an artist: a series, a raw title, a fused name', () => {
    expect(verdict({ h: [] }, { h: ['BASS BINGO'] })).toEqual({
      write: false,
      reason: 'would-add-an-artist',
    });
    expect(
      verdict(
        { h: ['Porter Robinson'] },
        { h: ['Porter Robinson'], s: ['Frost Children', '10cust'] },
      ),
    ).toEqual({ write: false, reason: 'would-add-an-artist' });
    expect(
      verdict(
        { h: ['Sub.mission'] },
        { h: ['Sub.mission presents: The Widdler w/ Athena'] },
      ),
    ).toMatchObject({ write: false });
  });

  it('refuses to drop a stored supporting act', () => {
    expect(
      verdict(
        { h: ['Levity'], s: ['Laser Therapy'] },
        { h: ['Levity'], s: [] },
      ),
    ).toEqual({ write: false, reason: 'would-drop-stored-supporting' });
  });

  it('leaves a row with no stored bill alone', () => {
    expect(verdict({ h: null }, { h: ['Kokoroko'] })).toEqual({
      write: false,
      reason: 'stored-bill-unknown',
    });
  });
});
