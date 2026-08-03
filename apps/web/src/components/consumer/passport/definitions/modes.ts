/**
 * The two Passport sizes, ported verbatim from `PP_MODES` in
 * `design/design_handoff_shareable_cards/passport-card.jsx`.
 *
 * These numbers are the design. They are not derived from each other and they
 * are not a scale factor applied to one base — re-deriving them is how the
 * compact preview stops matching the 1080 PNG it advertises.
 */

export type PassportMode = 'compact' | 'share'

export interface PassportModeConfig {
  width: number
  height: number
  cols: number
  rows: number
  pad: number
  gap: number
  radius: number
  stampRadius: number
  headEyebrow: number
  headHandle: number
  pillPadV: number
  pillPadH: number
  pillGap: number
  padTop: number
  padBottom: number
  statBig: number
  statMid: number
  statLabel: number
  panelGap: number
  wordmark: number
  dot: number
  footTag: number
  stampArtist: number
  stampDate: number
  panelPadX: number
  panelPadB: number
  /** The 1px-class strokes: tile rings, pill borders, the footer rule. */
  hairline: number
  grain: number
}

export const PP_MODES: Record<PassportMode, PassportModeConfig> = {
  compact: {
    width: 320,
    height: 500,
    cols: 3,
    rows: 3,
    pad: 15,
    gap: 8,
    radius: 20,
    stampRadius: 9,
    headEyebrow: 9.5,
    headHandle: 9,
    pillPadV: 5,
    pillPadH: 9,
    pillGap: 6,
    padTop: 54,
    padBottom: 132,
    statBig: 30,
    statMid: 17,
    statLabel: 8,
    panelGap: 10,
    wordmark: 15,
    dot: 13,
    footTag: 9.5,
    stampArtist: 10,
    stampDate: 8,
    panelPadX: 16,
    panelPadB: 15,
    hairline: 1,
    grain: 0.12,
  },
  share: {
    width: 1080,
    height: 1080,
    cols: 4,
    rows: 4,
    pad: 44,
    gap: 15,
    radius: 30,
    stampRadius: 16,
    headEyebrow: 21,
    headHandle: 19,
    pillPadV: 11,
    pillPadH: 20,
    pillGap: 12,
    padTop: 116,
    padBottom: 268,
    statBig: 74,
    statMid: 40,
    statLabel: 17,
    panelGap: 22,
    wordmark: 42,
    dot: 34,
    footTag: 20,
    stampArtist: 22,
    stampDate: 17,
    panelPadX: 48,
    panelPadB: 44,
    hairline: 1,
    grain: 0.1,
  },
}

/** The mode the PNG route renders. The compact mode is preview-only. */
export const PASSPORT_PRINT_MODE: PassportMode = 'share'

/**
 * Device-pixel multiplier for the PNG route.
 *
 * This is NOT a second design. The share mode's 1080 numbers stay the design;
 * the file is drawn at 2× and displayed at 1×, because a phone that paints a
 * 1080 card into a 3× viewport upscales it and the stamp labels go soft. Every
 * length in the config is multiplied, so proportions are identical.
 */
export const PASSPORT_PRINT_SCALE = 2

/** Counts and opacities — the only config values that are not lengths. */
const UNSCALED_KEYS = ['cols', 'rows', 'grain'] as const

export const scalePassportMode = (
  cfg: PassportModeConfig,
  scale: number,
): PassportModeConfig => {
  const scaled: Record<string, number> = {}
  for (const [key, value] of Object.entries(cfg)) {
    scaled[key] = UNSCALED_KEYS.some((unscaled) => unscaled === key)
      ? value
      : value * scale
  }
  return { ...cfg, ...scaled }
}
