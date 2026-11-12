export interface AdminShellUser {
  firstName: string | null;
  handle: string | null;
  email: string;
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

/** The initial in an accent ring, as drawn on every admin board. */
export const AdminAvatar = ({
  user,
  size,
}: {
  user: AdminShellUser;
  size: number;
}) => (
  <span
    aria-hidden
    style={{
      width: size,
      height: size,
      flex: 'none',
      borderRadius: '50%',
      background: 'color-mix(in srgb, var(--accent) 25%, var(--bg))',
      border: '1.5px solid var(--accent)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 800,
      color: 'var(--accent)',
      fontSize: Math.round(size * 0.42),
      lineHeight: 1,
    }}
  >
    {displayNameFor(user).replace(/^@/, '').charAt(0).toUpperCase()}
  </span>
);
