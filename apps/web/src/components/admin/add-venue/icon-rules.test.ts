import { describe, expect, it } from 'vitest';
import { ADMIN_COPY } from '@/components/admin/definitions/copy';
import {
  base64Of,
  checkReferenceFile,
  choicesOf,
  heroSettingGuess,
  hiddenSummary,
  referenceSrc,
  uploadChoice,
} from './icon-rules';

const COPY = ADMIN_COPY.addVenue.icon;
const GOOD_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4 L20 20"/><circle cx="12" cy="12" r="6"/></svg>';

describe('checkReferenceFile', () => {
  it('takes the four image types and refuses others by name', () => {
    expect(checkReferenceFile({ name: 'a.png', type: 'image/png' })).toEqual({
      ok: true,
      mediaType: 'image/png',
    });
    expect(
      checkReferenceFile({ name: 'a.svg', type: 'image/svg+xml' }),
    ).toEqual({ ok: false, error: COPY.references.wrongType('a.svg') });
  });
});

describe('references', () => {
  it('splits a data URL and rebuilds a thumbnail src', () => {
    expect(base64Of('data:image/png;base64,QUJD')).toBe('QUJD');
    expect(
      referenceSrc({ name: 'a.png', mediaType: 'image/png', data: 'QUJD' }),
    ).toBe('data:image/png;base64,QUJD');
  });
});

describe('choicesOf', () => {
  it('captions a draft by its source', () => {
    const out = choicesOf({
      drafts: [
        { label: 'One', source: { kind: 'name' }, svg: GOOD_SVG },
        {
          label: 'Two',
          source: { kind: 'reference', name: 'a.jpg' },
          svg: GOOD_SVG,
        },
      ],
      hidden: { fill: 0, offGrid: 0, invalid: 0, total: 2 },
      asked: 2,
    });
    expect(out.map((choice) => choice.caption)).toEqual([
      COPY.drafts.fromName,
      COPY.drafts.fromReference('a.jpg'),
    ]);
  });
});

describe('hiddenSummary', () => {
  it('is null when nothing was hidden', () => {
    expect(
      hiddenSummary({ fill: 0, offGrid: 0, invalid: 0, total: 4 }),
    ).toBeNull();
  });

  it('counts and names the reasons', () => {
    const out = hiddenSummary({ fill: 2, offGrid: 1, invalid: 0, total: 4 });
    expect(out?.badge).toBe(COPY.drafts.hiddenBadge(3, 4));
    expect(out?.body).toContain('2 used fills and 1 ran off the 24-point grid');
  });
});

describe('uploadChoice', () => {
  it('accepts a stroke-only 24 grid SVG', () => {
    const out = uploadChoice(GOOD_SVG, 'mine.svg');
    expect(out.ok).toBe(true);
    if (out.ok)
      expect(out.choice.caption).toBe(COPY.drafts.uploadedFrom('mine.svg'));
  });

  it('refuses a fill and unreadable text', () => {
    const filled = GOOD_SVG.replace('<circle', '<circle fill="red"');
    expect(uploadChoice(filled, 'f.svg')).toEqual({
      ok: false,
      error: COPY.drafts.uploadFill,
    });
    expect(uploadChoice('nope', 'f.svg')).toEqual({
      ok: false,
      error: COPY.drafts.uploadInvalid,
    });
  });
});

describe('heroSettingGuess', () => {
  it('follows the capacity type, else Street', () => {
    expect(heroSettingGuess('Club')).toBe('club');
    expect(heroSettingGuess('')).toBe('street');
  });
});
