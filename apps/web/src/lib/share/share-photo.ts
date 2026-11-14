// The share card's photo, fetched inside the edge route and handed to satori
// as a data URI. Every failure here is an ordinary fallback, never an error:
// a slow or broken photo host must not cost the card, so the next source in
// the chain is tried and, past the last, IdentityArt draws instead.
//
// The URLs are crawled third-party data, so this is an outbound fetch an
// outsider can steer. The edge runtime cannot resolve names, so a public name
// that resolves to a private address cannot be caught here. What can be is
// caught: IP literals of any kind, local and internal names, and redirects,
// which are followed by hand (at most two) and re-checked at every hop.

/** Per source, redirects included. Two sources, so the worst case is ~5s. */
export const SHARE_PHOTO_TIMEOUT_MS = 2_500;
/** A portrait is ~100KB; anything near this is not a photo we want inlined. */
export const SHARE_PHOTO_MAX_BYTES = 4_000_000;
export const SHARE_PHOTO_MAX_REDIRECTS = 2;

const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost', '.home.arpa'];

/**
 * True only for an http(s) URL on a public-looking hostname: no IP literal
 * (the URL parser already normalises `0x7f.1` and `2130706433` to dotted
 * form), no single-label name, nothing local or internal, no credentials.
 */
export const isPublicPhotoUrl = (raw: string): boolean => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  if (url.username !== '' || url.password !== '') return false;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[')) return false;
  if (/^[\d.]+$/.test(host)) return false;
  if (!host.includes('.') || host === 'localhost') return false;
  return !BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix));
};

/**
 * The formats satori and resvg both decode. Sniffed from the bytes because a
 * CDN's Content-Type is not to be trusted. WebP and AVIF are left out: they
 * fall through to the next source rather than risk a blank frame.
 */
export const sniffImageType = (bytes: Uint8Array): string | null => {
  const starts = (...magic: number[]) =>
    magic.every((byte, index) => bytes[index] === byte);
  if (starts(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (starts(0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  return null;
};

const toBase64 = (bytes: Uint8Array): string => {
  // Chunked: spreading a whole photo into fromCharCode overflows the stack.
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
};

/** The body, or null once it passes the cap: the stream is cancelled there. */
const readCapped = async (response: Response): Promise<Uint8Array | null> => {
  if (response.body === null) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > SHARE_PHOTO_MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const fetchOne = async (
  source: string,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<string | null> => {
  const signal = AbortSignal.timeout(timeoutMs);
  let url = source;
  for (let hop = 0; hop <= SHARE_PHOTO_MAX_REDIRECTS; hop += 1) {
    if (!isPublicPhotoUrl(url)) return null;
    const response = await fetcher(url, { redirect: 'manual', signal });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (location === null) return null;
      url = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) return null;
    const declared = Number(response.headers.get('content-length') ?? '0');
    if (declared > SHARE_PHOTO_MAX_BYTES) return null;
    const bytes = await readCapped(response);
    if (bytes === null || bytes.byteLength === 0) return null;
    const type = sniffImageType(bytes);
    return type === null ? null : `data:${type};base64,${toBase64(bytes)}`;
  }
  return null;
};

/** The first source that loads as a drawable image, or null for IdentityArt. */
export const loadSharePhoto = async (
  sources: readonly string[],
  fetcher: typeof fetch = fetch,
  timeoutMs: number = SHARE_PHOTO_TIMEOUT_MS,
): Promise<string | null> => {
  for (const url of sources) {
    try {
      const photo = await fetchOne(url, fetcher, timeoutMs);
      if (photo !== null) return photo;
    } catch {
      // A timeout, a reset or a malformed Location: try the next source.
    }
  }
  return null;
};
