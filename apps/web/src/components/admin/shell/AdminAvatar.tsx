import type { AvatarColor } from '@concert-crawl/types';
import { PersonAvatar } from '../primitives/PersonAvatar';

export interface AdminShellUser {
  firstName: string | null;
  handle: string | null;
  email: string;
  /** The admin's own avatar colours; unset reads as the house pair. */
  avatarColor?: AvatarColor | null | undefined;
  avatarSecondColor?: AvatarColor | null | undefined;
}

/** "hugh@…" to "hu•••": enough to tell two admins apart, never the address. */
const maskedLocalPart = (email: string): string =>
  `${(email.split('@')[0] ?? '').slice(0, 2)}•••`;

/**
 * First name, else @handle, else the masked email local part (#178 item 29).
 * Never a Clerk id or an address (rule 7).
 */
export const displayNameFor = (user: AdminShellUser): string =>
  user.firstName?.trim() ||
  (user.handle ? `@${user.handle}` : maskedLocalPart(user.email));

/** The admin's initial in their own two-colour ring, as every admin board draws it. */
export const AdminAvatar = ({
  user,
  size,
}: {
  user: AdminShellUser;
  size: number;
}) => (
  <PersonAvatar
    initialOf={displayNameFor(user).replace(/^@/, '')}
    avatarColor={user.avatarColor ?? null}
    avatarSecondColor={user.avatarSecondColor ?? null}
    size={size}
  />
);
