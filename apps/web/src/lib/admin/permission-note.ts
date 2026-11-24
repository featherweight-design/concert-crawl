import { ADMIN_COPY } from '@/components/admin/definitions/copy';

/**
 * The permission note as a `mailto:` link: it opens in the admin's own mail
 * app, so it goes out from their address. `email` may be null when the venue
 * has no contact address stored; the link then opens an unaddressed draft.
 */
export const permissionMailto = (
  venueName: string,
  email: string | null,
): string => {
  const note = ADMIN_COPY.permissionNote;
  const query = new URLSearchParams({
    subject: note.subject(venueName),
    body: note.body(venueName),
  })
    .toString()
    .replace(/\+/g, '%20');
  return `mailto:${email === null ? '' : encodeURIComponent(email)}?${query}`;
};
