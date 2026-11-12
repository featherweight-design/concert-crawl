// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { CrewPatch } from './CrewPatch';
import { crewIdentity } from './lib/crew-identity';

/**
 * The patch carries generated ids (clipPath, pattern) that differ per mount by
 * design, so structural comparison normalises them away. Everything else — the
 * geometry, the tokens, the layer set — must be identical for a given
 * (crewId, patchSalt).
 */
const patchShape = (crewId: string, patchSalt: number): string => {
  const { container } = render(
    <CrewPatch crewId={crewId} patchSalt={patchSalt} />,
  );
  const svg = container.querySelector('svg');
  if (svg === null) throw new Error('CrewPatch rendered no svg');
  return svg.innerHTML.replace(/cp[A-Za-z0-9_]+?(?=-clip|-w)/g, 'UID');
};

describe('CrewPatch determinism', () => {
  it('renders the same patch for the same (crewId, patchSalt)', () => {
    expect(patchShape('crew-alpha', 3)).toBe(patchShape('crew-alpha', 3));
    expect(patchShape('crew-beta', 0)).toBe(patchShape('crew-beta', 0));
  });

  it('renders a different patch for patchSalt + 1', () => {
    expect(patchShape('crew-alpha', 3)).not.toBe(patchShape('crew-alpha', 4));
    expect(patchShape('crew-beta', 0)).not.toBe(patchShape('crew-beta', 1));
  });

  it('renders a different patch for a different crewId at the same salt', () => {
    expect(patchShape('crew-alpha', 0)).not.toBe(patchShape('crew-beta', 0));
  });
});

describe('CrewPatch rendering', () => {
  it('is decorative: hidden from assistive tech and unfocusable', () => {
    const { container } = render(<CrewPatch crewId="crew-alpha" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('colours only from theme tokens, never a literal colour', () => {
    for (let i = 0; i < 40; i++) {
      const { container } = render(<CrewPatch crewId={`crew-${i}`} />);
      const markup = container.innerHTML;
      expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(markup).not.toMatch(/\brgba?\(/);
      expect(markup).not.toMatch(/\bhsla?\(/);
    }
  });

  it('drops the weave and the stitch at micro scale', () => {
    // A crew whose weave tiles as a pattern, so the drop is observable as the
    // absence of the pattern node rather than of loose lines.
    const crewId = Array.from({ length: 400 }, (_, i) => `crew-${i}`).find(
      (candidate) => crewIdentity(candidate, 0).weave !== 'warp',
    );
    if (crewId === undefined) throw new Error('no tiling-weave crew found');

    const tile = render(<CrewPatch crewId={crewId} scale="tile" />);
    expect(tile.container.querySelector('pattern')).not.toBeNull();

    const micro = render(<CrewPatch crewId={crewId} scale="micro" />);
    expect(micro.container.querySelector('pattern')).toBeNull();
  });

  it('draws no stitch ring at any scale', () => {
    for (const scale of ['hero', 'tile', 'micro'] as const) {
      const { container, unmount } = render(
        <CrewPatch crewId="crew-alpha" scale={scale} />,
      );
      expect(container.querySelectorAll('rect[stroke-dasharray]')).toHaveLength(
        0,
      );
      unmount();
    }
  });

  it('rims the hero patch in its chord colour, 3px, with an outer glow; the smaller scales keep the neutral rim', () => {
    const rim = (scale: 'hero' | 'tile') => {
      const { container, unmount } = render(
        <CrewPatch crewId="crew-alpha" scale={scale} />,
      );
      const svg = container.querySelector('svg') as SVGElement;
      const rects = Array.from(container.querySelectorAll('svg > rect'));
      const edge = rects[rects.length - 1] as SVGRectElement;
      const result = {
        stroke: edge.getAttribute('stroke'),
        width: edge.getAttribute('stroke-width'),
        filter: svg.style.filter,
      };
      unmount();
      return result;
    };

    const hero = rim('hero');
    expect(hero.stroke).toMatch(/^var\(--/);
    expect(hero.stroke).not.toBe('var(--border-strong)');
    expect(hero.width).toBe('3');
    expect(hero.filter).toContain('drop-shadow');

    const tile = rim('tile');
    expect(tile.stroke).toBe('var(--border-strong)');
    expect(tile.width).toBe('2');
    expect(tile.filter).toBe('');
  });

  it('honours the requested pixel size', () => {
    const { container } = render(<CrewPatch crewId="crew-alpha" size={54} />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('54');
  });
});
