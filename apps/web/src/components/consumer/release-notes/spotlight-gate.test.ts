import { describe, expect, it } from 'vitest';

import { RELEASES } from '@/lib/definitions/releases';
import { spotlightAvailable } from './spotlight-gate';

const spotlight = (hero: string) => ({
  spotlight: { title: 't', tagline: 'g', hero, steps: [] },
});

describe('spotlightAvailable', () => {
  it('never offers the retired Spotify spotlight', () => {
    expect(spotlightAvailable(spotlight('spotify'))).toBe(false);
  });

  it('offers any other hero', () => {
    expect(spotlightAvailable(spotlight('price'))).toBe(true);
  });

  it('is false for a release with no spotlight', () => {
    expect(spotlightAvailable({})).toBe(false);
  });

  it('regression: the shipped v0.10.0 Connect Spotify spotlight is hidden', () => {
    const spotify = RELEASES.find(
      (entry) => entry.spotlight?.hero === 'spotify',
    );
    if (spotify === undefined) throw new Error('the Spotify release is gone');
    expect(spotlightAvailable(spotify)).toBe(false);
  });
});
