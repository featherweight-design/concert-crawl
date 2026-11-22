import type { Release } from '@/lib/definitions/releases';

/**
 * Whether a release's spotlight may be offered. A spotlight is a promise to
 * show a feature; when the feature is gone, the strip and its CTA lead nowhere.
 * Spotify sync was retired (2026-10-29), so the v0.10.0 "Connect Spotify"
 * spotlight is never offered. The merged release entry itself is not edited.
 */
export const spotlightAvailable = (
  release: Pick<Release, 'spotlight'>,
): boolean =>
  release.spotlight !== undefined && release.spotlight.hero !== 'spotify';
