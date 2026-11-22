/**
 * Settings shows the account email masked, as the B+ settings board draws it: the first
 * character, five bullets, then the domain (`h•••••@gmail.com`). The bullet count is fixed,
 * so the mask never reveals how long the local part is.
 *
 * The admin mask (`maskEmail` in `apps/api/src/lib/mask-email.ts`, `h***@`) is a separate pattern for a
 * separate surface.
 */
const BULLETS = '•••••';

export const maskAccountEmail = (email: string): string => {
  const at = email.lastIndexOf('@');
  if (at < 1) return email === '' ? '' : BULLETS;
  return `${email.slice(0, 1)}${BULLETS}${email.slice(at)}`;
};
