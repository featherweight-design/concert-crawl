// Aspect ratios the share renderer supports. Fixed pixel artboards — satori
// has no percentage-sized root, so every dimension the poster draws is derived
// from these numbers rather than from a viewport.

export interface ShareRatioSpec {
  width: number;
  height: number;
}

export const SHARE_RATIOS = ['story', 'square', 'link'] as const;

// Derived from the tuple so one edit moves the type, the guard and the lookup
// together — same pattern as `lib/share/taglines.ts`.
export type ShareRatio = (typeof SHARE_RATIOS)[number];

export const DEFAULT_SHARE_RATIO: ShareRatio = 'story';

/**
 * ⚠️ `link` is 1200×628, not 1200×630. 628 is the locked value from the design
 * handoff's "Locked calls" — 630 was drift in an earlier ratio table. Do not
 * "correct" it.
 */
export const SC_RATIOS: Record<ShareRatio, ShareRatioSpec> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  link: { width: 1200, height: 628 },
};

/** The tilted photo card on Square and Wide: centre, side, tilt and ring. */
export interface ShareFrame {
  cx: number;
  cy: number;
  size: number;
  /** Degrees; negative lifts the right edge, as drawn. */
  tilt: number;
  border: number;
  radius: number;
}

/**
 * Every pixel measurement the B+ card uses, per ratio, measured off
 * `more-r3-share_shapes.jpg` and scaled to the artboard (story ×4.0, square
 * ×2.83, wide ×2.14). A table so it can be diffed against the board.
 */
export interface PosterMetrics {
  /** The text block's left edge, right inset and bottom inset. */
  textLeft: number;
  textRight: number;
  /** Null centres the block vertically (Wide). */
  textBottom: number | null;
  chip: { font: number; height: number; padX: number; dot: number };
  /** Name size, and the floor a long one-line name shrinks to. */
  name: number;
  nameFloor: number;
  meta: number;
  wordmark: number;
  countdown: number;
  /** Vertical rhythm: chip→name, name→meta, meta→rule, rule→footer. */
  gaps: [number, number, number, number];
  /** Null on Story, whose photo runs full-bleed instead. */
  frame: ShareFrame | null;
}

export const SC_METRICS: Record<ShareRatio, PosterMetrics> = {
  story: {
    textLeft: 72,
    textRight: 72,
    textBottom: 72,
    chip: { font: 40, height: 74, padX: 26, dot: 24 },
    name: 140,
    nameFloor: 140,
    meta: 42,
    wordmark: 51,
    countdown: 36,
    gaps: [26, 26, 54, 48],
    frame: null,
  },
  square: {
    textLeft: 72,
    textRight: 72,
    textBottom: 64,
    chip: { font: 32, height: 48, padX: 18, dot: 17 },
    name: 122,
    nameFloor: 72,
    meta: 32,
    wordmark: 40,
    countdown: 28,
    gaps: [22, 31, 45, 36],
    frame: { cx: 360, cy: 360, size: 524, tilt: -4, border: 8, radius: 40 },
  },
  link: {
    textLeft: 573,
    textRight: 48,
    textBottom: null,
    chip: { font: 22, height: 41, padX: 15, dot: 13 },
    name: 84,
    nameFloor: 52,
    meta: 24,
    wordmark: 30,
    countdown: 21,
    gaps: [17, 17, 31, 25],
    frame: { cx: 294, cy: 314, size: 430, tilt: -3.5, border: 7, radius: 34 },
  },
};

/** Closed-set guard. `apps/web` has no Zod; three members is a full validator. */
export const isShareRatio = (candidate: string): candidate is ShareRatio =>
  SHARE_RATIOS.some((ratio) => ratio === candidate);

/**
 * The route rejects an unknown ratio with a 400 rather than falling back, so
 * this resolver is only for callers that genuinely want a default (the sheet's
 * initial selection). Guard first — never index on an unvalidated string.
 */
export const resolveShareRatio = (raw: string | undefined): ShareRatio =>
  raw !== undefined && isShareRatio(raw) ? raw : DEFAULT_SHARE_RATIO;
