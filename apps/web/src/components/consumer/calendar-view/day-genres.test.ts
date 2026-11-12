import { describe, expect, it } from 'vitest';
import { dayGenreColors } from './day-genres';

const show = (date: string, genre: string[] | null) => ({ date, genre });

describe('dayGenreColors', () => {
  it('draws one dot per distinct bucket, most shows first', () => {
    const byDay = dayGenreColors([
      show('2026-11-09', ['rock']),
      show('2026-11-09', ['jazz']),
      show('2026-11-09', ['blues']), // jazz bucket: a second jazz show
      show('2026-11-10', ['country']),
    ]);
    expect(byDay.get('2026-11-09')).toEqual([
      'var(--genre-jazz)',
      'var(--genre-rock)',
    ]);
    expect(byDay.get('2026-11-10')).toEqual(['var(--genre-country)']);
  });

  it('breaks ties in the genre-buckets.ts order, not show order', () => {
    const byDay = dayGenreColors([
      show('2026-11-09', ['rock']),
      show('2026-11-09', ['pop']),
      show('2026-11-09', ['comedy']),
    ]);
    expect(byDay.get('2026-11-09')).toEqual([
      'var(--genre-comedy)',
      'var(--genre-pop)',
      'var(--genre-rock)',
    ]);
  });

  it('counts a multi-genre show for each of its buckets, once per bucket', () => {
    const byDay = dayGenreColors([
      show('2026-11-09', ['jazz', 'country']),
      show('2026-11-09', ['jazz', 'blues', 'soul']), // all jazz: counts once
      show('2026-11-09', ['metal']),
    ]);
    // jazz 2, country 1, metal 1 (tie: country before metal).
    expect(byDay.get('2026-11-09')).toEqual([
      'var(--genre-jazz)',
      'var(--genre-country)',
      'var(--genre-metal)',
    ]);
  });

  it('caps a day at four dots, keeping the most common buckets', () => {
    const byDay = dayGenreColors([
      show('2026-11-09', ['world']),
      show('2026-11-09', ['world']),
      show('2026-11-09', ['classical']),
      show('2026-11-09', ['comedy']),
      show('2026-11-09', ['country']),
      show('2026-11-09', ['electronic']),
    ]);
    expect(byDay.get('2026-11-09')).toEqual([
      'var(--genre-world)',
      'var(--genre-classical)',
      'var(--genre-comedy)',
      'var(--genre-country)',
    ]);
  });

  it('skips ungenred and unbucketed shows', () => {
    const byDay = dayGenreColors([
      show('2026-11-09', null),
      show('2026-11-09', ['zzz-not-a-genre']),
    ]);
    expect(byDay.has('2026-11-09')).toBe(false);
  });
});
