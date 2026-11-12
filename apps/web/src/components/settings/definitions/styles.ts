import type { AvatarColor } from '@concert-crawl/types';

/** The B+ blue-to-pink pair, used for rings, active edges and on-switches. */
export const SIGNAL_TO_ACCENT =
  'linear-gradient(135deg, var(--signal), var(--accent))';

export interface AvatarPair {
  first: AvatarColor;
  second: AvatarColor;
}

/**
 * The profile's avatar colours as a pair. A profile with no colour at all
 * gets the house signal-to-accent default; a profile with one colour and no
 * second is solid, as the pair contract says.
 */
export const avatarPair = (
  avatarColor: AvatarColor | null,
  avatarSecondColor: AvatarColor | null,
): AvatarPair => {
  if (avatarColor === null) return { first: 'signal', second: 'accent' };
  return { first: avatarColor, second: avatarSecondColor ?? avatarColor };
};
