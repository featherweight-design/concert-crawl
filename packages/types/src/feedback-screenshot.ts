// The one shape a feedback screenshot may take, checked where the API stores a
// report and again wherever an admin surface shows one.
//
// The fan's feedback form reads the picked file with FileReader.readAsDataURL
// and sends the result as `metadata.screenshot`, so a genuine screenshot is
// always an inline data image. Nothing is uploaded anywhere, so no host is
// ever ours: any http(s) or other URL is reporter-controlled, and rendering it
// in an <img> would send the admin's browser to that host (IP and referrer
// leak, tracking pixel). Raster types only, as base64: never svg+xml (it can
// carry script) or text.

/** The longest screenshot the API stores: a 6 MB image, base64-encoded. */
export const MAX_FEEDBACK_SCREENSHOT_CHARS = 8_000_000;

const SCREENSHOT_DATA_URI =
  /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/**
 * Whether `value` is a screenshot in our own format: a png, jpeg or webp data
 * image no longer than `maxChars`. Anything else is never stored or rendered.
 */
export const isFeedbackScreenshot = (
  value: unknown,
  maxChars: number = MAX_FEEDBACK_SCREENSHOT_CHARS,
): value is string =>
  typeof value === 'string' &&
  value.length <= maxChars &&
  SCREENSHOT_DATA_URI.test(value);

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
