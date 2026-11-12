import type { Release } from '@/lib/definitions/releases';

/**
 * Whether a release's spotlight may be offered. A spotlight is a promise to
 * show a feature; when the feature is off, the strip and its CTA lead nowhere.
 * Spotify sync was retired (2026-10-29) and its code sits behind the
 * `spotify-sync` flag, so the v0.10.0 "Connect Spotify" spotlight is offered
 * only while that flag is on. The merged release entry itself is not edited.
 */
export const spotlightAvailable = (
  release: Pick<Release, 'spotlight'>,
  spotifySyncEnabled: boolean,
): boolean => {
  if (release.spotlight === undefined) return false;
  if (release.spotlight.hero === 'spotify') return spotifySyncEnabled;
  return true;
};
