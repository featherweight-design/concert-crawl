import { isSafeHttpUrl } from '@/lib/is-safe-http-url';

// The share card's photo, fetched inside the edge route and handed to satori
// as a data URI. Every failure here is an ordinary fallback, never an error:
// a slow or broken photo host must not cost the card, so the next source in
// the chain is tried and, past the last, IdentityArt draws instead.

/** Per source. Two sources at most, so the worst case stays under 6s. */
export const SHARE_PHOTO_TIMEOUT_MS = 2_500;
/** A portrait is ~100KB; anything near this is not a photo we want inlined. */
export const SHARE_PHOTO_MAX_BYTES = 4_000_000;

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

const fetchOne = async (
  url: string,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<string | null> => {
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return null;
  const declared = Number(response.headers.get('content-length') ?? '0');
  if (declared > SHARE_PHOTO_MAX_BYTES) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > SHARE_PHOTO_MAX_BYTES)
    return null;
  const type = sniffImageType(bytes);
  return type === null ? null : `data:${type};base64,${toBase64(bytes)}`;
};

/** The first source that loads as a drawable image, or null for IdentityArt. */
export const loadSharePhoto = async (
  sources: readonly string[],
  fetcher: typeof fetch = fetch,
  timeoutMs: number = SHARE_PHOTO_TIMEOUT_MS,
): Promise<string | null> => {
  for (const url of sources) {
    if (!isSafeHttpUrl(url)) continue;
    try {
      const photo = await fetchOne(url, fetcher, timeoutMs);
      if (photo !== null) return photo;
    } catch {
      // A timeout, a DNS failure or a reset: try the next source.
    }
  }
  return null;
};
