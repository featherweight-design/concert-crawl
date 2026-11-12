import { describe, expect, it } from 'vitest';

import { RELEASES } from '@/lib/definitions/releases';
import { spotlightAvailable } from './spotlight-gate';

const spotlight = (hero: string) => ({
  spotlight: { title: 't', tagline: 'g', hero, steps: [] },
});

describe('spotlightAvailable', () => {
  it('hides the Spotify spotlight while Spotify sync is off, shows it when on', () => {
    expect(spotlightAvailable(spotlight('spotify'), false)).toBe(false);
    expect(spotlightAvailable(spotlight('spotify'), true)).toBe(true);
  });

  it('never gates another hero on the Spotify flag', () => {
    expect(spotlightAvailable(spotlight('price'), false)).toBe(true);
  });

  it('is false for a release with no spotlight', () => {
    expect(spotlightAvailable({}, true)).toBe(false);
  });

  it('regression: the shipped v0.10.0 Connect Spotify spotlight is hidden with the flag off', () => {
    const spotify = RELEASES.find(
      (entry) => entry.spotlight?.hero === 'spotify',
    );
    if (spotify === undefined) throw new Error('the Spotify release is gone');
    expect(spotlightAvailable(spotify, false)).toBe(false);
  });
});
