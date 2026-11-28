// The style check for a venue glyph that is not one of the drawn 21: an
// LLM draft (admin 3d) or an uploaded SVG. It holds the same rules as the set,
// a 24 × 24 grid stroked at 1.6 with no fills, and it is also the sanitizer.
// Nothing from the input survives except numbers and path commands: the
// result is rebuilt from parsed shapes, so a stored `glyph_svg` can carry no
// script, style, link or attribute the renderer did not write itself.
//
// Pure, with no DOM, so the API checks a draft or an upload before it is
// returned or saved, and the web renders the stored string by parsing it
// again into React elements (never as inner HTML).

export const GLYPH_GRID = 24;
export const GLYPH_STROKE_WIDTH = 1.6;
export const GLYPH_SVG_MAX_LENGTH = 6000;
export const GLYPH_SVG_MAX_SHAPES = 24;

export type GlyphSvgShape =
  | { tag: 'path'; d: string }
  | { tag: 'circle'; cx: number; cy: number; r: number }
  | { tag: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { tag: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { tag: 'polyline'; points: string }
  | {
      tag: 'rect';
      x: number;
      y: number;
      width: number;
      height: number;
      rx: number;
    };

/**
 * Why a glyph failed: `fill` (it paints a fill, so it won't match the
 * stroke-only set), `offGrid` (a point is outside 0 to 24), or `invalid`
 * (anything else: not an SVG, the wrong viewBox, an element or attribute
 * outside the allowlist, or too big).
 */
export type GlyphSvgFailure = 'fill' | 'offGrid' | 'invalid';

export type GlyphSvgResult =
  | { ok: true; svg: string; shapes: GlyphSvgShape[] }
  | { ok: false; reason: GlyphSvgFailure };

class GlyphError extends Error {
  constructor(readonly reason: GlyphSvgFailure) {
    super(reason);
  }
}

const fail = (reason: GlyphSvgFailure): never => {
  throw new GlyphError(reason);
};

// Presentation attributes a drawing tool writes that the renderer replaces
// with its own, so they are accepted and dropped. `fill` is checked, never
// dropped blind.
const IGNORED_ATTRIBUTES = new Set([
  'xmlns',
  'version',
  'width',
  'height',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
]);

const SHAPE_ATTRIBUTES: Record<GlyphSvgShape['tag'], readonly string[]> = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  rect: ['x', 'y', 'width', 'height', 'rx'],
};

const isShapeTag = (tag: string): tag is GlyphSvgShape['tag'] =>
  Object.hasOwn(SHAPE_ATTRIBUTES, tag);

const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;

const toNumber = (raw: string | undefined): number => {
  if (raw === undefined) return 0;
  const value = raw.trim();
  if (!NUMBER.test(value)) return fail('invalid');
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fail('invalid');
  return parsed;
};

const format = (value: number): string => {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
};

const onGrid = (...values: number[]): void => {
  for (const value of values) {
    if (value < 0 || value > GLYPH_GRID) fail('offGrid');
  }
};

const checkFill = (value: string | undefined): void => {
  if (value !== undefined && value.trim() !== 'none') fail('fill');
};

// ---- path data ----

const ARC_SAMPLES = 32;
/** Sampled points may sit this far past the grid's edge (float error). */
const ARC_TOLERANCE = 0.01;

/**
 * Checks every point along an SVG arc against the grid, via the spec's
 * endpoint-to-center conversion (SVG 1.1 appendix F.6.5 and F.6.6).
 */
const arcOnGrid = (
  fromX: number,
  fromY: number,
  rawRx: number,
  rawRy: number,
  rotation: number,
  largeArc: number,
  sweep: number,
  toX: number,
  toY: number,
): void => {
  let rx = Math.abs(rawRx);
  let ry = Math.abs(rawRy);
  // A zero radius, or no distance at all, draws a straight line or nothing.
  if (rx === 0 || ry === 0 || (fromX === toX && fromY === toY)) return;
  const phi = (rotation * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (fromX - toX) / 2;
  const dy = (fromY - toY) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const coef =
    (largeArc === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = (coef * rx * y1) / ry;
  const cy1 = (-coef * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (fromX + toX) / 2;
  const cy = sin * cx1 + cos * cy1 + (fromY + toY) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number): number =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const theta = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let delta = angle(
    (x1 - cx1) / rx,
    (y1 - cy1) / ry,
    (-x1 - cx1) / rx,
    (-y1 - cy1) / ry,
  );
  if (sweep === 0 && delta > 0) delta -= 2 * Math.PI;
  if (sweep === 1 && delta < 0) delta += 2 * Math.PI;
  for (let i = 1; i < ARC_SAMPLES; i += 1) {
    const at = theta + (delta * i) / ARC_SAMPLES;
    const px = cx + rx * Math.cos(at) * cos - ry * Math.sin(at) * sin;
    const py = cy + rx * Math.cos(at) * sin + ry * Math.sin(at) * cos;
    // Written as "not inside" so a NaN (a radius that underflows) fails too.
    const inside = (value: number): boolean =>
      value >= -ARC_TOLERANCE && value <= GLYPH_GRID + ARC_TOLERANCE;
    if (!inside(px) || !inside(py)) {
      fail('offGrid');
    }
  }
};

const PATH_ARGS: Record<string, number> = {
  m: 2,
  l: 2,
  h: 1,
  v: 1,
  c: 6,
  s: 4,
  q: 4,
  t: 2,
  a: 7,
  z: 0,
};

/**
 * Parses path data command by command, tracking the pen so relative commands
 * are checked against the grid too, and writes it back out canonically.
 * Endpoints and control points must sit on the grid (a curve stays inside
 * its control points, so that holds the whole curve); an arc is sampled
 * along its sweep, since its bulge can leave the grid with both ends on it.
 */
export const normalizePathData = (data: string): string => {
  if (!/^[MmZzLlHhVvCcSsQqTtAa0-9.,\s+\-eE]*$/.test(data)) fail('invalid');
  let pos = 0;
  const skip = (): void => {
    while (pos < data.length && /[\s,]/.test(data.charAt(pos))) pos += 1;
  };
  const readNumber = (): number => {
    skip();
    const match = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(
      data.slice(pos),
    );
    if (!match) return fail('invalid');
    pos += match[0].length;
    return toNumber(match[0]);
  };
  const readFlag = (): number => {
    skip();
    const flag = data.charAt(pos);
    if (flag !== '0' && flag !== '1') return fail('invalid');
    pos += 1;
    return Number(flag);
  };

  const out: string[] = [];
  let penX = 0;
  let penY = 0;
  let startX = 0;
  let startY = 0;
  let command = '';
  // The last curve's final control point and command, for S and T.
  let controlX = 0;
  let controlY = 0;
  let lastCommand = '';

  skip();
  while (pos < data.length) {
    const next = data.charAt(pos);
    if (/[A-Za-z]/.test(next)) {
      command = next;
      pos += 1;
    } else if (command === '' || command.toLowerCase() === 'z') {
      fail('invalid');
    } else if (command === 'M') {
      command = 'L';
    } else if (command === 'm') {
      command = 'l';
    }
    const lower = command.toLowerCase();
    const relative = command !== command.toUpperCase();
    const argCount = PATH_ARGS[lower];
    if (argCount === undefined) return fail('invalid');

    if (lower === 'z') {
      out.push(command);
      penX = startX;
      penY = startY;
      lastCommand = lower;
      skip();
      continue;
    }

    const args: number[] = [];
    for (let i = 0; i < argCount; i += 1) {
      args.push(
        lower === 'a' && (i === 3 || i === 4) ? readFlag() : readNumber(),
      );
    }
    const baseX = relative ? penX : 0;
    const baseY = relative ? penY : 0;

    if (lower === 'h') {
      penX = baseX + (args[0] ?? 0);
      onGrid(penX);
    } else if (lower === 'v') {
      penY = baseY + (args[0] ?? 0);
      onGrid(penY);
    } else if (lower === 'a') {
      const [rx = 0, ry = 0, rotation = 0, large = 0, sweep = 0, x = 0, y = 0] =
        args;
      if (rx < 0 || ry < 0) fail('invalid');
      onGrid(baseX + x, baseY + y);
      arcOnGrid(
        penX,
        penY,
        rx,
        ry,
        rotation,
        large,
        sweep,
        baseX + x,
        baseY + y,
      );
      penX = baseX + x;
      penY = baseY + y;
    } else {
      for (let i = 0; i < args.length; i += 2) {
        onGrid(baseX + (args[i] ?? 0), baseY + (args[i + 1] ?? 0));
      }
      // S and T draw with an unwritten control point, the last one reflected
      // through the pen, so it is checked too.
      if (lower === 's' || lower === 't') {
        const follows = lower === 's' ? /[cs]/ : /[qt]/;
        const reflected = follows.test(lastCommand)
          ? [2 * penX - controlX, 2 * penY - controlY]
          : [penX, penY];
        onGrid(...reflected);
        if (lower === 't') {
          controlX = reflected[0] ?? penX;
          controlY = reflected[1] ?? penY;
        }
      }
      if (lower === 'c' || lower === 's' || lower === 'q') {
        controlX = baseX + (args[args.length - 4] ?? 0);
        controlY = baseY + (args[args.length - 3] ?? 0);
      }
      penX = baseX + (args[args.length - 2] ?? 0);
      penY = baseY + (args[args.length - 1] ?? 0);
    }
    lastCommand = lower;
    if (lower === 'm') {
      startX = penX;
      startY = penY;
    }
    out.push(`${command}${args.map(format).join(' ')}`);
    skip();
  }
  if (out.length === 0 || !/^[Mm]/.test(out[0] ?? '')) fail('invalid');
  return out.join(' ');
};

const normalizePoints = (raw: string): string => {
  const values = raw
    .trim()
    .split(/[\s,]+/)
    .map(toNumber);
  if (values.length < 4 || values.length % 2 !== 0) fail('invalid');
  onGrid(...values);
  const pairs: string[] = [];
  for (let i = 0; i < values.length; i += 2) {
    pairs.push(`${format(values[i] ?? 0)},${format(values[i + 1] ?? 0)}`);
  }
  return pairs.join(' ');
};

// ---- elements ----

const buildShape = (
  tag: GlyphSvgShape['tag'],
  attrs: Map<string, string>,
): GlyphSvgShape => {
  const num = (name: string): number => toNumber(attrs.get(name));
  switch (tag) {
    case 'path': {
      const data = attrs.get('d');
      if (data === undefined) return fail('invalid');
      return { tag, d: normalizePathData(data) };
    }
    case 'circle': {
      const [cx, cy, r] = [num('cx'), num('cy'), num('r')];
      if (r <= 0) fail('invalid');
      onGrid(cx - r, cx + r, cy - r, cy + r);
      return { tag, cx, cy, r };
    }
    case 'ellipse': {
      const [cx, cy, rx, ry] = [num('cx'), num('cy'), num('rx'), num('ry')];
      if (rx <= 0 || ry <= 0) fail('invalid');
      onGrid(cx - rx, cx + rx, cy - ry, cy + ry);
      return { tag, cx, cy, rx, ry };
    }
    case 'line': {
      const [x1, y1, x2, y2] = [num('x1'), num('y1'), num('x2'), num('y2')];
      onGrid(x1, y1, x2, y2);
      return { tag, x1, y1, x2, y2 };
    }
    case 'polyline': {
      const points = attrs.get('points');
      if (points === undefined) return fail('invalid');
      return { tag, points: normalizePoints(points) };
    }
    case 'rect': {
      const [x, y, width, height, rx] = [
        num('x'),
        num('y'),
        num('width'),
        num('height'),
        num('rx'),
      ];
      if (width <= 0 || height <= 0 || rx < 0) fail('invalid');
      onGrid(x, y, x + width, y + height);
      return { tag, x, y, width, height, rx };
    }
  }
};

// Attribute values in double or single quotes, as drawing tools write both.
const TAG =
  /<(\/?)([a-zA-Z]+)((?:\s+[a-zA-Z][a-zA-Z0-9:-]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*)\s*(\/?)>/y;
const ATTRIBUTE = /([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*(?:"([^"<>]*)"|'([^'<>]*)')/g;

const parseAttributes = (raw: string): Map<string, string> => {
  const attrs = new Map<string, string>();
  for (const match of raw.matchAll(ATTRIBUTE)) {
    const [, name = '', doubled, single] = match;
    const value = doubled ?? single ?? '';
    if (attrs.has(name)) fail('invalid');
    attrs.set(name, value);
  }
  return attrs;
};

/** Checks the attributes a tag may not carry, then the ones it may. */
const screen = (
  attrs: Map<string, string>,
  allowed: readonly string[],
): void => {
  checkFill(attrs.get('fill'));
  for (const name of attrs.keys()) {
    if (name === 'fill' || IGNORED_ATTRIBUTES.has(name)) continue;
    if (!allowed.includes(name)) fail('invalid');
  }
};

const serializeShape = (shape: GlyphSvgShape): string => {
  switch (shape.tag) {
    case 'path':
      return `<path d="${shape.d}"/>`;
    case 'circle':
      return `<circle cx="${format(shape.cx)}" cy="${format(shape.cy)}" r="${format(shape.r)}"/>`;
    case 'ellipse':
      return `<ellipse cx="${format(shape.cx)}" cy="${format(shape.cy)}" rx="${format(shape.rx)}" ry="${format(shape.ry)}"/>`;
    case 'line':
      return `<line x1="${format(shape.x1)}" y1="${format(shape.y1)}" x2="${format(shape.x2)}" y2="${format(shape.y2)}"/>`;
    case 'polyline':
      return `<polyline points="${shape.points}"/>`;
    case 'rect':
      return `<rect x="${format(shape.x)}" y="${format(shape.y)}" width="${format(shape.width)}" height="${format(shape.height)}" rx="${format(shape.rx)}"/>`;
  }
};

const parse = (input: string): GlyphSvgShape[] => {
  if (input.length > GLYPH_SVG_MAX_LENGTH) fail('invalid');
  // What an editor's export wraps a glyph in, none of it drawn: the prolog,
  // a doctype, comments, a title or description, and an empty <defs>.
  const source = input
    .replace(/^\s*<\?xml[^?<>]*\?>/, '')
    .replace(/^\s*<!DOCTYPE[^<>[\]]*>/i, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(title|desc)(?:\s[^<>]*)?>[^<>]*<\/\1>/gi, '')
    .replace(/<defs\s*(?:\/>|>\s*<\/defs>)/gi, '');

  const shapes: GlyphSvgShape[] = [];
  // The open elements: `svg` first, then any `g`, and a shape written with a
  // separate close tag (`<path ...></path>`) while it waits for that close.
  const stack: string[] = [];
  let closedRoot = false;
  let pos = 0;

  for (;;) {
    while (pos < source.length && /\s/.test(source.charAt(pos))) pos += 1;
    if (pos >= source.length) break;
    if (closedRoot) fail('invalid');
    TAG.lastIndex = pos;
    const match = TAG.exec(source);
    if (!match) return fail('invalid');
    pos = TAG.lastIndex;
    const [, closing = '', rawTag = '', rawAttrs = '', selfClosing = ''] =
      match;
    const tag = rawTag.toLowerCase();

    if (closing) {
      if (rawAttrs || selfClosing || stack.pop() !== tag) fail('invalid');
      if (stack.length === 0) closedRoot = true;
      continue;
    }
    const top = stack[stack.length - 1];
    if (top !== undefined && isShapeTag(top)) fail('invalid');
    const attrs = parseAttributes(rawAttrs);

    if (tag === 'svg') {
      if (stack.length > 0 || selfClosing) fail('invalid');
      screen(attrs, ['viewBox']);
      const viewBox = (attrs.get('viewBox') ?? '').trim().split(/[\s,]+/);
      if (viewBox.join(' ') !== `0 0 ${GLYPH_GRID} ${GLYPH_GRID}`) {
        fail('invalid');
      }
      stack.push(tag);
    } else if (tag === 'g') {
      if (stack.length === 0) fail('invalid');
      screen(attrs, []);
      if (!selfClosing) stack.push(tag);
    } else if (isShapeTag(tag)) {
      if (stack.length === 0) fail('invalid');
      screen(attrs, SHAPE_ATTRIBUTES[tag]);
      shapes.push(buildShape(tag, attrs));
      if (shapes.length > GLYPH_SVG_MAX_SHAPES) fail('invalid');
      if (!selfClosing) stack.push(tag);
    } else {
      fail('invalid');
    }
  }
  if (!closedRoot || shapes.length === 0) fail('invalid');
  return shapes;
};

/** The canonical SVG for checked shapes: the set's stroke, no fill, currentColor. */
export const glyphSvgFromShapes = (shapes: GlyphSvgShape[]): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GLYPH_GRID} ${GLYPH_GRID}" fill="none" stroke="currentColor" stroke-width="${GLYPH_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">${shapes
    .map(serializeShape)
    .join('')}</svg>`;

/**
 * Checks a glyph against the set's style and returns it rebuilt, or why it
 * failed. The check stops at the first failure it meets.
 */
export const validateGlyphSvg = (input: string): GlyphSvgResult => {
  try {
    const shapes = parse(input);
    return { ok: true, svg: glyphSvgFromShapes(shapes), shapes };
  } catch (err) {
    if (err instanceof GlyphError) return { ok: false, reason: err.reason };
    throw err;
  }
};

/**
 * The backdrops a venue's hero art can sit on. Mirrors the `hero_setting` DB
 * enum; the API's integration test fails if the two drift.
 */
export const HERO_SETTINGS = [
  'street',
  'outdoor',
  'arena',
  'theater',
  'club',
  'gallery',
] as const;
export type HeroSetting = (typeof HERO_SETTINGS)[number];
