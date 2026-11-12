export interface AdminShellUser {
  firstName: string | null;
  email: string;
}

export const displayNameFor = (user: AdminShellUser): string =>
  user.firstName ?? user.email;

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
    {displayNameFor(user).charAt(0).toUpperCase()}
  </span>
);
