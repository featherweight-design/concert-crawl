import { describe, expect, it } from 'vitest';
import { dayGenreColors } from './day-genres';

const show = (date: string, genre: string[] | null) => ({ date, genre });

describe('dayGenreColors', () => {
  it('collects one color per distinct lead genre, in show order', () => {
    const byDay = dayGenreColors(
      [
        show('2026-11-09', ['jazz']),
        show('2026-11-09', ['comedy']),
        show('2026-11-09', ['blues']), // same bucket as jazz: no second dot
        show('2026-11-10', ['country']),
      ],
      undefined,
    );
    expect(byDay.get('2026-11-09')).toEqual([
      'var(--genre-jazz)',
      'var(--genre-comedy)',
    ]);
    expect(byDay.get('2026-11-10')).toEqual(['var(--genre-country)']);
  });

  it('skips ungenred and unbucketed shows', () => {
    const byDay = dayGenreColors(
      [show('2026-11-09', null), show('2026-11-09', ['zzz-not-a-genre'])],
      undefined,
    );
    expect(byDay.has('2026-11-09')).toBe(false);
  });

  it('lets the Vibe filter pick the lead genre, as the row edge does', () => {
    const byDay = dayGenreColors(
      [show('2026-11-09', ['jazz', 'country'])],
      'country',
    );
    expect(byDay.get('2026-11-09')).toEqual(['var(--genre-country)']);
  });
});
