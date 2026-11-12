import { describe, expect, it } from 'vitest';
import { partsOf, rulingOf, type JoinedEvidence } from './joined-names.js';

const evidence = (whole: string[], parts: string[]): JoinedEvidence => ({
  whole: async (name) => whole.includes(name),
  part: async (name) => parts.includes(name),
});

describe('partsOf', () => {
  it('splits on " & " and " + " only', () => {
    expect(partsOf('Nas & The Roots')).toEqual(['Nas', 'The Roots']);
    expect(partsOf('A + B')).toEqual(['A', 'B']);
    expect(partsOf('Earth, Wind and Fire')).toEqual([]);
    expect(partsOf('Dubfire')).toEqual([]);
  });
});

describe('rulingOf', () => {
  it('keeps the whole when an independent source names it', async () => {
    expect(
      await rulingOf(
        'Iron & Wine',
        evidence(['Iron & Wine'], ['Iron', 'Wine']),
      ),
    ).toBe('whole');
  });

  it('splits when the whole is unknown and every part is known', async () => {
    expect(
      await rulingOf('Nas & The Roots', evidence([], ['Nas', 'The Roots'])),
    ).toBe('split');
  });

  it('is unresolved when a part is unknown, or nothing is', async () => {
    expect(await rulingOf('Nas & Locals', evidence([], ['Nas']))).toBe(
      'unresolved',
    );
    expect(await rulingOf('Jade Cicada & Mickman', evidence([], []))).toBe(
      'unresolved',
    );
  });

  it('never splits on the strength of a source that could not answer', async () => {
    const down: JoinedEvidence = {
      whole: async () => null,
      part: async () => true,
    };
    expect(await rulingOf('Iron & Wine', down)).toBe('unresolved');
    const partDown: JoinedEvidence = {
      whole: async () => false,
      part: async (name) => (name === 'Nas' ? true : null),
    };
    expect(await rulingOf('Nas & The Roots', partDown)).toBe('unresolved');
  });

  it('has nothing to rule on a name that joins nothing', async () => {
    expect(await rulingOf('Dubfire', evidence([], []))).toBe('whole');
  });
});
