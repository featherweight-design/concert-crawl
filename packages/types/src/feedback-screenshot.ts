// The one shape a feedback screenshot may take, checked where the fan picks a
// file, where the API stores a report, and wherever an admin surface shows one.
//
// The fan's feedback form reads the picked file with FileReader.readAsDataURL
// and sends the result as `metadata.screenshot`, so a genuine screenshot is
// always an inline data image. Nothing is uploaded anywhere, so no host is
// ever ours: any http(s) or other URL is reporter-controlled, and rendering it
// in an <img> would send the admin's browser to that host (IP and referrer
// leak, tracking pixel). Raster types every browser renders, as base64 only:
// never svg+xml (it can carry script), heic, bmp or text.

/** The image types a fan may attach, as the file picker's `accept` reads them. */
export const FEEDBACK_SCREENSHOT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

/** The longest screenshot the API stores: a 6 MB image, base64-encoded. */
export const MAX_FEEDBACK_SCREENSHOT_CHARS = 8_000_000;

/**
 * The cap the Needs you queue reads under. Tighter than the write cap: every
 * unread bug rides in every queue list and count response.
 */
export const MAX_QUEUE_SCREENSHOT_CHARS = 200_000;

// The longest prefix an allowed type gives (`data:image/jpeg;base64,`).
const LONGEST_PREFIX_CHARS = Math.max(
  ...FEEDBACK_SCREENSHOT_TYPES.map((type) => `data:${type};base64,`.length),
);

/**
 * The largest file the fan form reads: base64 turns every 3 bytes into 4
 * characters, so this is the biggest file whose data URL fits the write cap.
 */
export const MAX_FEEDBACK_SCREENSHOT_BYTES =
  Math.floor((MAX_FEEDBACK_SCREENSHOT_CHARS - LONGEST_PREFIX_CHARS) / 4) * 3;

const SCREENSHOT_DATA_URI =
  /^data:image\/(?:png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/]+={0,2}$/i;

/** Why a value is not a screenshot in our own format, or null when it is one. */
export type FeedbackScreenshotRejection = 'not_string' | 'size' | 'type';

export const feedbackScreenshotRejection = (
  value: unknown,
  maxChars: number = MAX_FEEDBACK_SCREENSHOT_CHARS,
): FeedbackScreenshotRejection | null => {
  if (typeof value !== 'string') return 'not_string';
  // Length first, so an oversized value is never run through the pattern.
  if (value.length > maxChars) return 'size';
  return SCREENSHOT_DATA_URI.test(value) ? null : 'type';
};

/**
 * Whether `value` is a screenshot in our own format: a png, jpeg, webp, gif or
 * avif base64 data image no longer than `maxChars`. Anything else is never
 * stored or rendered.
 */
export const isFeedbackScreenshot = (
  value: unknown,
  maxChars: number = MAX_FEEDBACK_SCREENSHOT_CHARS,
): value is string => feedbackScreenshotRejection(value, maxChars) === null;

/**
 * Whether the fan may attach a file of this type: the picker's own check,
 * before the file is read. Case-insensitive, as the data URL check is.
 */
export const isFeedbackScreenshotType = (type: string): boolean =>
  FEEDBACK_SCREENSHOT_TYPES.some((allowed) => allowed === type.toLowerCase());

/**
 * The screenshot a report's metadata carries (`screenshot`, or the legacy
 * `screenshotDataUrl`), or null when neither is in our own format.
 */
export const feedbackScreenshotOf = (
  metadata: unknown,
  maxChars: number = MAX_FEEDBACK_SCREENSHOT_CHARS,
): string | null => {
  if (typeof metadata !== 'object' || metadata === null) return null;
  for (const key of ['screenshot', 'screenshotDataUrl']) {
    const value: unknown = Reflect.get(metadata, key);
    if (isFeedbackScreenshot(value, maxChars)) return value;
  }
  return null;
};
