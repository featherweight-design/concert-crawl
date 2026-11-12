// The iPhone launch images (`apple-touch-startup-image`): one still per screen
// size, drawn by `app/api/pwa/startup/[size]`. iOS picks by media query, so
// every portrait iPhone size needs its own entry (B+ README rule 12).

export interface StartupSize {
  /** Device pixels. */
  width: number;
  height: number;
  /** CSS pixels and pixel ratio, for the media query. */
  cssWidth: number;
  cssHeight: number;
  ratio: 2 | 3;
}

export const STARTUP_SIZES: readonly StartupSize[] = [
  // iPhone 16 Pro Max, 16 Pro and Air. iOS does not fall back to its own
  // splash for a device no media query matches, so each generation is listed.
  { width: 1320, height: 2868, cssWidth: 440, cssHeight: 956, ratio: 3 },
  { width: 1206, height: 2622, cssWidth: 402, cssHeight: 874, ratio: 3 },
  { width: 1260, height: 2736, cssWidth: 420, cssHeight: 912, ratio: 3 },
  { width: 1290, height: 2796, cssWidth: 430, cssHeight: 932, ratio: 3 },
  { width: 1179, height: 2556, cssWidth: 393, cssHeight: 852, ratio: 3 },
  { width: 1284, height: 2778, cssWidth: 428, cssHeight: 926, ratio: 3 },
  { width: 1170, height: 2532, cssWidth: 390, cssHeight: 844, ratio: 3 },
  { width: 1125, height: 2436, cssWidth: 375, cssHeight: 812, ratio: 3 },
  { width: 1242, height: 2688, cssWidth: 414, cssHeight: 896, ratio: 3 },
  { width: 828, height: 1792, cssWidth: 414, cssHeight: 896, ratio: 2 },
  { width: 1242, height: 2208, cssWidth: 414, cssHeight: 736, ratio: 3 },
  { width: 750, height: 1334, cssWidth: 375, cssHeight: 667, ratio: 2 },
  { width: 640, height: 1136, cssWidth: 320, cssHeight: 568, ratio: 2 },
];

export const startupSizeKey = (size: StartupSize): string =>
  `${size.width}x${size.height}`;

export const startupImagePath = (size: StartupSize): string =>
  `/api/pwa/startup/${startupSizeKey(size)}`;

export const startupMedia = (size: StartupSize): string =>
  `(device-width: ${size.cssWidth}px) and (device-height: ${size.cssHeight}px) and (-webkit-device-pixel-ratio: ${size.ratio}) and (orientation: portrait)`;

/** The `metadata.appleWebApp.startupImage` list, for every size. */
export const startupImageLinks = (): { url: string; media: string }[] =>
  STARTUP_SIZES.map((size) => ({
    url: startupImagePath(size),
    media: startupMedia(size),
  }));

export const findStartupSize = (key: string): StartupSize | undefined =>
  STARTUP_SIZES.find((size) => startupSizeKey(size) === key);
