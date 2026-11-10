import { describe, expect, it } from 'vitest';
import { pickBestEffortCandidate } from './best-effort-artist-pick.js';

const candidate = (
  name: string,
  imageUrl: string | null = 'https://i/x.jpg',
) => ({
  id: `id-${name}`,
  name,
  imageUrl,
});

describe('pickBestEffortCandidate', () => {
  it("takes Spotify's top result when it is the act and has a photo", () => {
    const top = candidate('Tori Rose');
    expect(
      pickBestEffortCandidate([top, candidate('Tori Rose')], {
        name: 'Tori Rose',
        canonicalName: 'tori rose',
      }),
    ).toEqual({ picked: top });
  });

  it('folds case, accents and stray whitespace on the candidate', () => {
    const top = candidate('Lotus ');
    expect(
      pickBestEffortCandidate([top], { name: 'Lotus', canonicalName: 'lotus' }),
    ).toEqual({ picked: top });
  });

  it('declines when the top result is a different act (pearl under Pearl Jam)', () => {
    expect(
      pickBestEffortCandidate([candidate('Pearl Jam'), candidate('pearl')], {
        name: 'Pearl',
        canonicalName: 'pearl',
      }),
    ).toEqual({ declined: 'top-not-exact' });
  });

  it('declines a top result with no photo', () => {
    expect(
      pickBestEffortCandidate([candidate('Krugah', null)], {
        name: 'krugah',
        canonicalName: 'krugah',
      }),
    ).toEqual({ declined: 'top-no-photo' });
  });

  it('declines a row whose name is a billing cut at a separator', () => {
    expect(
      pickBestEffortCandidate([candidate('Beacons')], {
        name: 'Beacons & Brews',
        canonicalName: 'beacons',
      }),
    ).toEqual({ declined: 'not-a-whole-act' });
  });

  it('declines a row with no snapshot', () => {
    expect(
      pickBestEffortCandidate(null, { name: 'X', canonicalName: 'x' }),
    ).toEqual({ declined: 'no-snapshot' });
    expect(
      pickBestEffortCandidate([], { name: 'X', canonicalName: 'x' }),
    ).toEqual({ declined: 'no-snapshot' });
  });
});
