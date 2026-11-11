import { userProfiles } from '@concert-crawl/db';
import type { AvatarColor } from '@concert-crawl/types';

/**
 * The avatar columns every payload that draws someone's avatar selects, so a
 * new avatar attribute is one edit here rather than one per projection.
 * Spread into a `.select({ ... })`. A function so the table isn't read at
 * module load, which keeps unit-test mocks of `@concert-crawl/db` working.
 */
export const avatarColumns = () => ({
  avatarColor: userProfiles.avatarColor,
  avatarSecondColor: userProfiles.avatarSecondColor,
});

/** The avatar fields of a selected row (or a missing profile), nulls kept. */
export const avatarOf = (
  row:
    | {
        avatarColor: AvatarColor | null;
        avatarSecondColor: AvatarColor | null;
      }
    | null
    | undefined,
): {
  avatarColor: AvatarColor | null;
  avatarSecondColor: AvatarColor | null;
} => ({
  avatarColor: row?.avatarColor ?? null,
  avatarSecondColor: row?.avatarSecondColor ?? null,
});
