/**
 * An outside URL (a Wikimedia file, a licence deed) is only ever rendered as a
 * link when it is http or https. The API builds these from Wikimedia's own
 * answers, so a bad scheme is never expected; this keeps a `javascript:` URL
 * from reaching an `href` if one ever arrives.
 */
export const safeHref = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
};
