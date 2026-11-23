import type { ArtistInfoFacts } from '@concert-crawl/types';
import { describe, expect, it } from 'vitest';

import { aboutFactsFor, identityLineFor, typeWord } from './artist-info-view';

const facts = (over: Partial<ArtistInfoFacts> = {}): ArtistInfoFacts => ({
  mbid: 'm',
  type: 'Group',
  area: 'Denver',
  disambiguation: null,
  links: {
    musicbrainz: 'https://musicbrainz.org/artist/m',
    wikidata: null,
    spotify: null,
  },
  ...over,
});

describe('typeWord', () => {
  it('maps Person and Group, and shows every other type as Artist', () => {
    expect(typeWord('Person')).toBe('Solo artist');
    expect(typeWord('Group')).toBe('Band');
    expect(typeWord('Orchestra')).toBe('Artist');
    expect(typeWord('Other')).toBe('Artist');
    expect(typeWord(null)).toBeNull();
  });
});

describe('identityLineFor', () => {
  it('prefers disambiguation, then type, then adds the area', () => {
    expect(identityLineFor(facts())).toBe('Band · Denver');
    expect(
      identityLineFor(facts({ disambiguation: 'Colorado rock band' })),
    ).toBe('Colorado rock band · Denver');
    expect(identityLineFor(facts({ area: null }))).toBe('Band');
  });

  it('says Artist when MusicBrainz has a row with nothing to say, null with no row', () => {
    expect(identityLineFor(facts({ type: null, area: null }))).toBe('Artist');
    expect(identityLineFor(null)).toBeNull();
  });
});

describe('aboutFactsFor', () => {
  it('has a TYPE and a FROM row, and drops a missing one', () => {
    expect(aboutFactsFor(facts()).map((row) => row.value)).toEqual([
      'Band',
      'Denver',
    ]);
    expect(aboutFactsFor(facts({ area: null }))).toHaveLength(1);
    expect(aboutFactsFor(facts({ type: null, area: null }))).toEqual([]);
    expect(aboutFactsFor(null)).toEqual([]);
  });
});
