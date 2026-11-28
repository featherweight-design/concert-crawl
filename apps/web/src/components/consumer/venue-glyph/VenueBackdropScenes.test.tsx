// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { VenueNeonArt } from './VenueNeonArt';

function renderHero(setting: 'theater' | 'club' | 'gallery') {
  return render(
    <VenueNeonArt
      glyphKey="ogden"
      glyphSize={163}
      glyphSizeSm={245}
      setting={setting}
    />,
  ).container;
}

describe('theater, club and gallery heroes', () => {
  it('theater draws curtain folds in the venue colour, a lip, and a bulb strip', () => {
    const root = renderHero('theater');
    expect(
      root
        .querySelector('[data-venue-neon]')
        ?.getAttribute('data-venue-setting'),
    ).toBe('theater');
    const phone = root.querySelector('svg[data-venue-backdrop="theater"]');
    // 8 folds each side, the stage lip, nothing else filled full height.
    expect(phone?.querySelectorAll('rect')).toHaveLength(16 + 1);
    const wide = root.querySelector('svg[data-venue-backdrop-wide="theater"]');
    expect(wide?.getAttribute('viewBox')).toBe('0 0 1200 420');
    expect(wide?.getAttribute('class')).toContain('lg:block');
    // Bulbs and the valance are a top-anchored strip, not part of the sliced scene.
    expect(phone?.querySelectorAll('circle')).toHaveLength(0);
    const strip = root.querySelector('svg[data-venue-strip="theater-phone"]');
    expect(strip?.querySelectorAll('circle')).toHaveLength(15);
    expect(strip?.getAttribute('preserveAspectRatio')).toBe('xMidYMin meet');
    expect(
      root
        .querySelector('svg[data-venue-strip="theater-wide"]')
        ?.querySelectorAll('circle'),
    ).toHaveLength(38);
  });

  it('club draws four beams from four lamps, two pin spots and a floor edge', () => {
    const root = renderHero('club');
    const phone = root.querySelector('svg[data-venue-backdrop="club"]');
    expect(phone?.querySelectorAll('linearGradient')).toHaveLength(4);
    const strip = root.querySelector('svg[data-venue-strip="club-phone"]');
    // 4 lamps + 2 pin spots with a glow disc each.
    expect(strip?.querySelectorAll('circle')).toHaveLength(4 + 4);
  });

  it('gallery draws a room in perspective and no top strip', () => {
    const root = renderHero('gallery');
    const phone = root.querySelector('svg[data-venue-backdrop="gallery"]');
    // 20 floor rays + 6 depth lines.
    expect(phone?.querySelectorAll('path')).toHaveLength(26);
    // The vanishing point sits on the 42% horizon, centred.
    expect(phone?.querySelector('path')?.getAttribute('d')).toMatch(
      /^M190 84 /,
    );
    expect(phone?.querySelectorAll('rect[rx]')).toHaveLength(3);
    expect(root.querySelector('[data-venue-strip]')).toBeNull();
  });
});
