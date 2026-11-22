import { describe, expect, it } from 'vitest';
import {
  GLYPH_SVG_MAX_LENGTH,
  GLYPH_SVG_MAX_SHAPES,
  normalizePathData,
  validateGlyphSvg,
} from './glyph-svg';

const svg = (body: string, rootAttrs = 'viewBox="0 0 24 24" fill="none"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${rootAttrs}>${body}</svg>`;

const reason = (input: string) => {
  const result = validateGlyphSvg(input);
  return result.ok ? 'ok' : result.reason;
};

describe('validateGlyphSvg', () => {
  it('passes a stroke-only glyph and rebuilds it canonically', () => {
    const result = validateGlyphSvg(
      svg(
        '<path d="M4 20 L12 4 L20 20 Z" stroke="#fff" stroke-width="1.6"/>' +
          '<circle cx="12" cy="14" r="2"></circle>',
      ),
    );
    expect(result).toEqual({
      ok: true,
      shapes: [
        { tag: 'path', d: 'M4 20 L12 4 L20 20 Z' },
        { tag: 'circle', cx: 12, cy: 14, r: 2 },
      ],
      svg:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M4 20 L12 4 L20 20 Z"/><circle cx="12" cy="14" r="2"/></svg>',
    });
  });

  it('is idempotent: its own output passes unchanged', () => {
    const first = validateGlyphSvg(
      svg(
        '<g><line x1="2" y1="2" x2="22" y2="22"/><polyline points="2,22 12,12 22,2"/>' +
          '<rect x="4" y="4" width="16" height="10" rx="2"/><ellipse cx="12" cy="12" rx="6" ry="3"/></g>',
      ),
    );
    if (!first.ok) throw new Error(first.reason);
    expect(validateGlyphSvg(first.svg)).toEqual(first);
  });

  it('accepts an XML prolog, comments and a drawing tool’s presentation attributes', () => {
    expect(
      reason(
        '<?xml version="1.0" encoding="UTF-8"?>\n<!-- exported -->' +
          svg(
            '<path d="M2 2h20" stroke-linecap="round" stroke-linejoin="round"/>',
            'width="24" height="24" viewBox="0,0,24,24" fill="none" stroke="currentColor" stroke-width="1.6"',
          ),
      ),
    ).toBe('ok');
  });

  it('accepts single quotes and the wrapping an editor exports', () => {
    expect(
      reason("<svg viewBox='0 0 24 24' fill='none'><path d='M2 2h20'/></svg>"),
    ).toBe('ok');
    expect(
      reason(
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
          svg(
            '<title>Glass and note</title><desc id="d">Made in a tool</desc><defs/><defs></defs><path d="M2 2h20"/>',
          ),
      ),
    ).toBe('ok');
  });

  it('fails a fill on a shape, a group or the root', () => {
    expect(reason(svg('<path d="M2 2h20v20z" fill="#f00"/>'))).toBe('fill');
    expect(reason(svg('<g fill="red"><path d="M2 2h20"/></g>'))).toBe('fill');
    expect(
      reason(svg('<path d="M2 2h20"/>', 'viewBox="0 0 24 24" fill="black"')),
    ).toBe('fill');
  });

  it('fails a point off the 24 grid, absolute or relative', () => {
    expect(reason(svg('<path d="M2 2 L25 2"/>'))).toBe('offGrid');
    expect(reason(svg('<path d="M20 2 l5 0"/>'))).toBe('offGrid');
    expect(reason(svg('<path d="M2 2 h10 h13"/>'))).toBe('offGrid');
    expect(reason(svg('<path d="M2 2 C2 -1 10 2 12 2"/>'))).toBe('offGrid');
    expect(reason(svg('<circle cx="22" cy="12" r="4"/>'))).toBe('offGrid');
    expect(reason(svg('<rect x="10" y="10" width="20" height="4"/>'))).toBe(
      'offGrid',
    );
    expect(reason(svg('<polyline points="0,0 24,24 25,1"/>'))).toBe('offGrid');
  });

  it('tracks the pen through relative and implicit commands', () => {
    expect(normalizePathData('m2 2 4 4 4 4')).toBe('m2 2 l4 4 l4 4');
    expect(reason(svg('<path d="m2 2 10 10 10 10"/>'))).toBe('ok');
    expect(reason(svg('<path d="m2 2 10 10 10 10 3 3"/>'))).toBe('offGrid');
    // Z returns the pen to the subpath start, so the relative move is from 2,2.
    expect(reason(svg('<path d="M2 2 L20 20 Z m1 1 l1 1"/>'))).toBe('ok');
  });

  it('reads arc flags written without separators', () => {
    expect(normalizePathData('M4 12a8 8 0 1016 0')).toBe(
      'M4 12 a8 8 0 1 0 16 0',
    );
    expect(reason(svg('<path d="M4 12a30 30 0 1016 0"/>'))).toBe('offGrid');
  });

  it('checks the control point S and T reflect, which is never written', () => {
    // C's second control 10,4 reflects through the pen at 20,12 to 30,20.
    expect(reason(svg('<path d="M4 12 C4 4 10 4 20 12 S22 20 22 12"/>'))).toBe(
      'offGrid',
    );
    expect(reason(svg('<path d="M4 12 C4 4 10 4 12 12 S20 20 20 12"/>'))).toBe(
      'ok',
    );
    // T after Q reflects the control; T alone uses the pen.
    expect(reason(svg('<path d="M2 12 Q2 2 20 12 T22 12"/>'))).toBe('offGrid');
    expect(reason(svg('<path d="M2 12 T22 12"/>'))).toBe('ok');
  });

  it('fails an arc whose radius underflows, rather than skipping it', () => {
    expect(reason(svg('<path d="M2 2 A1e-200 1e-200 0 0 1 22 22"/>'))).toBe(
      'offGrid',
    );
  });

  it('checks an arc along its sweep, not only at its ends', () => {
    // A half circle of radius 8 from 4,12 to 20,12 tops out at y 4.
    expect(reason(svg('<path d="M4 12 A8 8 0 0 1 20 12"/>'))).toBe('ok');
    // Both ends and radii on the grid, but the large arc rises far above it.
    expect(reason(svg('<path d="M0 12 A24 24 0 1 1 24 12"/>'))).toBe('offGrid');
    // A radius too small for the gap is scaled up to a half circle (to y 0).
    expect(reason(svg('<path d="M0 12 A1 1 0 0 1 24 12"/>'))).toBe('ok');
    // Relative: the large arc's low point is y 24.9.
    expect(reason(svg('<path d="M4 4 a12 12 0 1 0 16 0"/>'))).toBe('offGrid');
  });

  it('fails anything outside the allowlist as invalid', () => {
    const cases = [
      'not an svg',
      svg('<script>alert(1)</script>'),
      svg('<path d="M2 2h20" onload="alert(1)"/>'),
      svg('<path d="M2 2h20" style="fill:red"/>'),
      svg('<path d="M2 2h20" transform="scale(4)"/>'),
      svg('<image href="https://example.com/x.png"/>'),
      svg('<use href="#a"/>'),
      svg('<text>hi</text>'),
      svg('<path d="M2 2h20"/>hello'),
      svg('<path d="url(#x)"/>'),
      svg('<path d="M2 2h20" d="M1 1"/>'),
      svg('<path d="L2 2"/>'),
      svg('<path d="M2 2h20">'),
      svg(''),
      svg('<path d="M2 2h20"/>', 'viewBox="0 0 48 48"'),
      `${svg('<path d="M2 2h20"/>')}<svg viewBox="0 0 24 24"></svg>`,
      svg('<defs><linearGradient id="a"/></defs><path d="M2 2h20"/>'),
      svg('<title><b>x</b></title><path d="M2 2h20"/>'),
      svg('<path d="M2 2h20"/>'.repeat(GLYPH_SVG_MAX_SHAPES + 1)),
      svg(' '.repeat(GLYPH_SVG_MAX_LENGTH)),
    ];
    for (const input of cases) {
      expect({ input, reason: reason(input) }).toEqual({
        input,
        reason: 'invalid',
      });
    }
  });
});
