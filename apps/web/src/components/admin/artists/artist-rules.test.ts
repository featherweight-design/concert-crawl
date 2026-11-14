import { describe, expect, it } from 'vitest';
import type { AdminArtistRow, ArtistCandidate } from './artists-api';
import {
  belongsTo,
  candidateCards,
  defaultSelection,
  isToCheck,
  primaryWrite,
  showLine,
  toCheckKind,
} from './artist-rules';

const candidate = (id: string): ArtistCandidate => ({
  id,
  name: `Artist ${id}`,
  imageUrl: `https://img/${id}`,
  genres: ['indie soul'],
});

const row = (over: Partial<AdminArtistRow> = {}): AdminArtistRow => ({
  id: 'row-1',
  name: 'Cashmere',
  spotifyArtistId: null,
  matchStatus: 'ambiguous',
  photoUrl: null,
  autoMatchedAt: null,
  openReportCount: 0,
  wrongPhotoReportCount: 0,
  upcomingCount: 1,
  watchingCount: 0,
  nextShow: { date: '2026-11-15', venueName: 'Lost Lake' },
  candidates: [candidate('a'), candidate('b'), candidate('c')],
  ...over,
});

describe('toCheckKind', () => {
  it('ranks a report over the match state', () => {
    expect(
      toCheckKind(row({ openReportCount: 2, matchStatus: 'matched' })),
    ).toBe('reported');
  });

  it('reads an unconfirmed automatic match as Check', () => {
    expect(
      toCheckKind(
        row({ matchStatus: 'matched', autoMatchedAt: '2026-11-01T00:00:00Z' }),
      ),
    ).toBe('check');
  });

  it('reads unmatched as No match', () => {
    expect(toCheckKind(row({ matchStatus: 'unmatched' }))).toBe('no_match');
  });
});

describe('isToCheck', () => {
  it('drops a confirmed match and a Not artists row', () => {
    expect(isToCheck(row({ matchStatus: 'matched' }))).toBe(false);
    expect(isToCheck(row({ matchStatus: 'not_an_artist' }))).toBe(false);
    expect(isToCheck(row({ matchStatus: 'no_match' }))).toBe(true);
  });
});

describe('belongsTo', () => {
  it('keeps an automatic match in To check, not Matched', () => {
    const auto = row({
      matchStatus: 'matched',
      autoMatchedAt: '2026-11-01T00:00:00Z',
    });
    expect(belongsTo('to_check', auto)).toBe(true);
    expect(belongsTo('matched', auto)).toBe(false);
    expect(belongsTo('matched', row({ matchStatus: 'matched' }))).toBe(true);
    expect(
      belongsTo('not_an_artist', row({ matchStatus: 'not_an_artist' })),
    ).toBe(true);
  });
});

describe('showLine', () => {
  it('writes the venue and the calendar day', () => {
    expect(showLine(row())).toBe('Lost Lake · Sun Nov 15');
  });

  it('is null with no show left', () => {
    expect(showLine(row({ nextShow: null }))).toBeNull();
  });
});

describe('candidateCards', () => {
  it('draws two candidates, current match first', () => {
    const cards = candidateCards(
      row({ spotifyArtistId: 'c', openReportCount: 1 }),
      'reported',
    );
    expect(
      cards.map((card) => card.type === 'artist' && card.candidate.id),
    ).toEqual(['c', 'a']);
  });

  it('draws a current match the snapshot lacks, and selects it', () => {
    const cards = candidateCards(
      row({
        spotifyArtistId: 'zz',
        photoUrl: 'https://img/zz',
        openReportCount: 1,
      }),
      'reported',
    );
    expect(cards[0]).toEqual({
      type: 'artist',
      candidate: {
        id: 'zz',
        name: 'Cashmere',
        imageUrl: 'https://img/zz',
        genres: null,
      },
    });
    expect(defaultSelection(cards)).toBe('zz');
  });

  it('fills an empty slot with the Search card', () => {
    const cards = candidateCards(
      row({ candidates: [candidate('a')] }),
      'no_match',
    );
    expect(cards.map((card) => card.type)).toEqual(['artist', 'search']);
    expect(candidateCards(row({ candidates: null }), 'no_match')).toEqual([
      { type: 'search' },
    ]);
  });

  it('draws only the matched artist on a Check row', () => {
    const cards = candidateCards(
      row({ matchStatus: 'matched', spotifyArtistId: 'b' }),
      'check',
    );
    expect(cards).toEqual([{ type: 'artist', candidate: candidate('b') }]);
    expect(defaultSelection(cards)).toBe('b');
  });
});

describe('primaryWrite', () => {
  it('confirms the automatic pick', () => {
    expect(
      primaryWrite(
        row({ spotifyArtistId: 'b', autoMatchedAt: '2026-11-01T00:00:00Z' }),
        candidate('b'),
      ),
    ).toEqual({ kind: 'confirm', spotifyArtistId: 'b' });
  });

  it('re-saves the current match on a reported row (dismiss)', () => {
    expect(
      primaryWrite(
        row({ spotifyArtistId: 'b', openReportCount: 2 }),
        candidate('b'),
      ),
    ).toEqual({ kind: 'keep', spotifyArtistId: 'b' });
  });

  it('uses another candidate with its photo', () => {
    expect(primaryWrite(row(), candidate('a'))).toEqual({
      kind: 'use',
      spotifyArtistId: 'a',
      photoUrl: 'https://img/a',
    });
    expect(primaryWrite(row(), null)).toBeNull();
  });
});
