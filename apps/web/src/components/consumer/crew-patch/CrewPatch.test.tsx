// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { CrewPatch, patchRimMetrics } from './CrewPatch';
import { crewIdentity, CREW_CHORD_TOKENS } from './lib/crew-identity';

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

// The generic patch (addendum 5 item 13): where no crew exists yet, the same
// patch for everyone, in the default chord (signal and accent).
describe('CrewPatch generic', () => {
  const generic = (crewId: string): string => {
    const { container } = render(<CrewPatch crewId={crewId} generic />);
    const svg = container.querySelector('svg');
    if (svg === null) throw new Error('CrewPatch rendered no svg');
    return svg.innerHTML.replace(/cp[A-Za-z0-9_]+?(?=-clip|-w)/g, 'UID');
  };

  it('is the same patch whatever crew id it is handed', () => {
    expect(generic('crew-alpha')).toBe(generic('crew-beta'));
    expect(generic('')).toBe(generic('crew-alpha'));
  });

  it('draws the board hex glyph: a filled inner hex in signal, an outlined one in accent', () => {
    const { container } = render(<CrewPatch crewId="" generic />);
    const filled = container.querySelector(
      'path[d="M28 21l6 3.5v7L28 35l-6-3.5v-7z"]',
    );
    const outlined = container.querySelector(
      'path[d="M28 15l11 6.5v13L28 41l-11-6.5v-13z"]',
    );
    expect(filled?.getAttribute('fill')).toBe('var(--signal)');
    expect(outlined?.getAttribute('stroke')).toBe('var(--accent)');
    // A short spoke leaves each of the six vertices.
    expect(
      container.querySelectorAll('g[transform^="scale"] line'),
    ).toHaveLength(6);
  });

  it('keeps the frame: the rim in the accent, the glow from 56px up', () => {
    const { container } = render(<CrewPatch crewId="" generic size={96} />);
    const rim = container.querySelector('rect[stroke="var(--accent)"]');
    expect(rim).not.toBeNull();
    expect(container.querySelector('svg')?.style.filter).toContain(
      'drop-shadow',
    );
  });

  it('does not change a real crew patch', () => {
    const { container } = render(<CrewPatch crewId="crew-alpha" />);
    expect(container.querySelector('g[transform^="scale"] line')).toBeNull();
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

  it('scales the rim and glow from the 56px kit (addendum 4, item 2)', () => {
    expect(patchRimMetrics(16)).toEqual({
      rimWidthPx: 1,
      rimWidthUnits: 6.25,
      radiusPx: 4,
      glowBlurPx: null,
    });
    expect(patchRimMetrics(18)).toEqual({
      rimWidthPx: 1,
      rimWidthUnits: 5.556,
      radiusPx: 4.5,
      glowBlurPx: null,
    });
    expect(patchRimMetrics(56)).toEqual({
      rimWidthPx: 1.5,
      rimWidthUnits: 2.679,
      radiusPx: 14,
      glowBlurPx: 8,
    });
    expect(patchRimMetrics(96)).toEqual({
      rimWidthPx: 2.571,
      rimWidthUnits: 2.679,
      radiusPx: 24,
      glowBlurPx: 13.714,
    });
  });

  it('draws the rim in the secondary at 60%, glowing from 56px up only', () => {
    const crewId = 'crew-alpha';
    const secondary = `var(${
      CREW_CHORD_TOKENS[crewIdentity(crewId, 0).chord].secondary
    })`;
    const rim = (size: number) => {
      const { container, unmount } = render(
        <CrewPatch crewId={crewId} size={size} scale="hero" />,
      );
      const svg = container.querySelector('svg') as SVGElement;
      const rects = Array.from(container.querySelectorAll('svg > rect'));
      const edge = rects[rects.length - 1] as SVGRectElement;
      const clip = container.querySelector('clipPath rect') as SVGRectElement;
      const result = {
        stroke: edge.getAttribute('stroke'),
        opacity: edge.getAttribute('stroke-opacity'),
        width: edge.getAttribute('stroke-width'),
        x: edge.getAttribute('x'),
        rx: edge.getAttribute('rx'),
        clipRx: clip.getAttribute('rx'),
        filter: svg.style.filter,
      };
      unmount();
      return result;
    };

    const at16 = rim(16);
    expect(at16).toMatchObject({
      stroke: secondary,
      opacity: '0.6',
      width: '6.25',
      x: '3.125',
      rx: '21.875',
      clipRx: '25',
      filter: '',
    });

    const at18 = rim(18);
    expect(at18).toMatchObject({ width: '5.556', clipRx: '25', filter: '' });

    const at56 = rim(56);
    expect(at56).toMatchObject({
      stroke: secondary,
      opacity: '0.6',
      width: '2.679',
      clipRx: '25',
    });
    expect(at56.filter).toContain('drop-shadow(0 0 8px');
    expect(at56.filter).toContain(`${secondary} 35%`);

    const at96 = rim(96);
    expect(at96).toMatchObject({ width: '2.679', clipRx: '25' });
    expect(at96.filter).toContain('drop-shadow(0 0 13.714px');
    expect(at96.filter).toContain(`${secondary} 35%`);
  });

  it('draws no rim and no glow for a size of zero or less', () => {
    for (const size of [0, -4, Number.NaN]) {
      expect(patchRimMetrics(size)).toEqual({
        rimWidthPx: 0,
        rimWidthUnits: 0,
        radiusPx: 0,
        glowBlurPx: null,
      });
    }
    const { container } = render(<CrewPatch crewId="crew-alpha" size={0} />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.innerHTML).not.toContain('Infinity');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(container.querySelector('svg > rect')).toBeNull();
    expect(svg.style.filter).toBe('');
  });

  it('fills the viewBox and insets the rim by half its stroke, as the board draws it', () => {
    const { container } = render(
      <CrewPatch crewId="crew-alpha" size={56} scale="hero" />,
    );
    const clip = container.querySelector('clipPath rect') as SVGRectElement;
    // Full bleed: no offset, the whole 0-100 box, radius 25 (14/56).
    expect(clip.getAttribute('x')).toBeNull();
    expect(clip.getAttribute('y')).toBeNull();
    expect(clip.getAttribute('width')).toBe('100');
    expect(clip.getAttribute('height')).toBe('100');
    expect(clip.getAttribute('rx')).toBe('25');

    const rects = Array.from(container.querySelectorAll('svg > rect'));
    const edge = rects[rects.length - 1] as SVGRectElement;
    const half = 2.679 / 2;
    expect(Number(edge.getAttribute('x'))).toBeCloseTo(half, 6);
    expect(Number(edge.getAttribute('y'))).toBeCloseTo(half, 6);
    expect(Number(edge.getAttribute('width'))).toBeCloseTo(100 - 2.679, 6);
    expect(Number(edge.getAttribute('height'))).toBeCloseTo(100 - 2.679, 6);
    expect(Number(edge.getAttribute('rx'))).toBeCloseTo(25 - half, 6);
    // The stroke's outer edge lands exactly on the silhouette.
    expect(Number(edge.getAttribute('x')) - half).toBeCloseTo(0, 6);
  });

  it('keys the glow on size, not scale', () => {
    const filterOf = (size: number, scale: 'hero' | 'tile' | 'micro') => {
      const { container, unmount } = render(
        <CrewPatch crewId="crew-alpha" size={size} scale={scale} />,
      );
      const filter = (container.querySelector('svg') as SVGElement).style
        .filter;
      unmount();
      return filter;
    };
    expect(filterOf(55, 'hero')).toBe('');
    expect(filterOf(64, 'tile')).toContain('drop-shadow');
  });

  it('honours the requested pixel size', () => {
    const { container } = render(<CrewPatch crewId="crew-alpha" size={54} />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('54');
  });
});
