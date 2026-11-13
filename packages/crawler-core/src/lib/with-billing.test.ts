import { describe, expect, it } from 'vitest';
import {
  demoteActsAfterWith,
  hasWithJoiner,
  keepWithJoiner,
} from './with-billing.js';

describe('keepWithJoiner', () => {
  it('puts back the "with" the model rewrote as "&" (Clipse with J.I.D.)', () => {
    expect(keepWithJoiner('Clipse & J.I.D', 'Clipse with J.I.D.')).toBe(
      'Clipse with J.I.D',
    );
  });

  it('keeps the venue\'s "w/" where the model wrote a comma', () => {
    expect(
      keepWithJoiner(
        'The Widdler, Thelem, Roommate',
        'The Widdler w/ Thelem, Roommate',
      ),
    ).toBe('The Widdler w/ Thelem, Roommate');
  });

  it('restores the joiner around a decoration the model stripped', () => {
    expect(
      keepWithJoiner(
        'Earl Sweatshirt & MIKE + Harrison',
        'Earl Sweatshirt & MIKE w/ Harrison AT OGDEN THEATRE',
      ),
    ).toBe('Earl Sweatshirt & MIKE w/ Harrison');
  });

  it('follows the title case for a word joiner', () => {
    expect(keepWithJoiner('Clipse and J.I.D', 'CLIPSE WITH J.I.D.')).toBe(
      'Clipse with J.I.D',
    );
  });

  it('leaves a genuine "&" co-headline alone', () => {
    expect(
      keepWithJoiner(
        'Desert Dwellers & Great Dane',
        'Desert Dwellers & Great Dane',
      ),
    ).toBe('Desert Dwellers & Great Dane');
  });

  it('leaves a title that kept the joiner alone', () => {
    expect(keepWithJoiner('Clipse with J.I.D', 'Clipse with J.I.D.')).toBe(
      'Clipse with J.I.D',
    );
  });

  it('does not touch an "&" inside a name next to the joiner', () => {
    expect(
      keepWithJoiner('Iron & Wine with Calexico', 'Iron & Wine with Calexico'),
    ).toBe('Iron & Wine with Calexico');
  });
});

describe('hasWithJoiner', () => {
  it.each([
    'Clipse with J.I.D.',
    'The Widdler w/ Thelem',
    'The Widdler w/Thelem',
    'Open House featuring Peazy',
    'Peazy feat. GLOX',
    'Peazy ft. GLOX',
    'Band special guest Opener',
  ])('reads "%s" as a with-style billing', (title) => {
    expect(hasWithJoiner(title)).toBe(true);
  });

  it.each([
    'Desert Dwellers & Great Dane',
    'Iron & Wine',
    'Gone Without Trace',
  ])('reads "%s" as no with-style billing', (title) => {
    expect(hasWithJoiner(title)).toBe(false);
  });
});

describe('demoteActsAfterWith', () => {
  it('bills the act after "with" as support (Clipse with J.I.D.)', () => {
    expect(
      demoteActsAfterWith(
        'Clipse with J.I.D.',
        ['Clipse', 'J.I.D'],
        ['Samara Cyn'],
      ),
    ).toEqual({
      headliners: ['Clipse'],
      supportingArtists: ['J.I.D', 'Samara Cyn'],
    });
  });

  it('bills every act after "w/" as support', () => {
    expect(
      demoteActsAfterWith(
        'The Widdler w/ Thelem, Roommate',
        ['The Widdler', 'Thelem', 'Roommate'],
        [],
      ),
    ).toEqual({
      headliners: ['The Widdler'],
      supportingArtists: ['Thelem', 'Roommate'],
    });
  });

  it('does not list a demoted act twice', () => {
    expect(
      demoteActsAfterWith('Clipse with J.I.D.', ['Clipse', 'J.I.D'], ['J.I.D']),
    ).toEqual({ headliners: ['Clipse'], supportingArtists: ['J.I.D'] });
  });

  it('keeps the co-headliners billed before "with"', () => {
    expect(
      demoteActsAfterWith(
        'Clipse & J.I.D with Samara Cyn',
        ['Clipse', 'J.I.D'],
        ['Samara Cyn'],
      ),
    ).toEqual({
      headliners: ['Clipse', 'J.I.D'],
      supportingArtists: ['Samara Cyn'],
    });
  });

  it('leaves a genuine "&" co-headline as two headliners', () => {
    expect(
      demoteActsAfterWith(
        'Desert Dwellers & Great Dane',
        ['Desert Dwellers', 'Great Dane'],
        [],
      ),
    ).toEqual({
      headliners: ['Desert Dwellers', 'Great Dane'],
      supportingArtists: [],
    });
  });

  it('leaves "An Evening with X & Y" alone: the joiner introduces the headliners', () => {
    expect(
      demoteActsAfterWith(
        'An Evening with Nas & The Roots',
        ['Nas', 'The Roots'],
        [],
      ),
    ).toEqual({ headliners: ['Nas', 'The Roots'], supportingArtists: [] });
  });

  it('never moves the only headliner', () => {
    expect(demoteActsAfterWith('Clipse with J.I.D.', ['Clipse'], [])).toEqual({
      headliners: ['Clipse'],
      supportingArtists: [],
    });
  });
});
