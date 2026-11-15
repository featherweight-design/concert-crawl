import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_SCREENSHOT_TYPES,
  MAX_FEEDBACK_SCREENSHOT_BYTES,
  MAX_FEEDBACK_SCREENSHOT_CHARS,
  MAX_QUEUE_SCREENSHOT_CHARS,
  feedbackScreenshotOf,
  feedbackScreenshotRejection,
  isFeedbackScreenshot,
  isFeedbackScreenshotType,
} from './feedback-screenshot.js';

describe('isFeedbackScreenshot', () => {
  it.each([
    'data:image/png;base64,AAAA',
    'data:image/jpeg;base64,/9j/4AAQ',
    'data:image/webp;base64,UklGRg==',
    'data:image/gif;base64,R0lGODlh',
    'data:image/avif;base64,AAAAIGZ0eXBhdmlm',
    'data:IMAGE/PNG;base64,AAAA',
  ])('keeps an inline raster image: %s', (value) => {
    expect(isFeedbackScreenshot(value)).toBe(true);
  });

  it.each([
    'https://tracker.example.com/pixel.png',
    'http://169.254.169.254/latest',
    '//tracker.example.com/pixel.png',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'data:image/heic;base64,AAAA',
    'data:image/bmp;base64,Qk0=',
    'data:application/octet-stream;base64,AAAA',
    'data:text/html;base64,PGI+aGk8L2I+',
    'data:image/png,not-base64',
    'data:image/png;base64,AAAA"><script>',
    ' data:image/png;base64,AAAA',
    '',
  ])('refuses anything else: %s', (value) => {
    expect(isFeedbackScreenshot(value)).toBe(false);
  });

  it('refuses a non-string', () => {
    expect(isFeedbackScreenshot(null)).toBe(false);
    expect(isFeedbackScreenshot(undefined)).toBe(false);
    expect(isFeedbackScreenshot(42)).toBe(false);
  });

  it('refuses an image over the cap, and honours a tighter one', () => {
    const prefix = 'data:image/png;base64,';
    const atCap =
      prefix + 'A'.repeat(MAX_FEEDBACK_SCREENSHOT_CHARS - prefix.length);
    expect(isFeedbackScreenshot(atCap)).toBe(true);
    expect(isFeedbackScreenshot(`${atCap}A`)).toBe(false);
    expect(isFeedbackScreenshot('data:image/png;base64,AAAAAAAA', 20)).toBe(
      false,
    );
  });
});

describe('feedbackScreenshotRejection', () => {
  it('names why a value was refused', () => {
    expect(
      feedbackScreenshotRejection('data:image/png;base64,AAAA'),
    ).toBeNull();
    expect(feedbackScreenshotRejection(42)).toBe('not_string');
    expect(feedbackScreenshotRejection('https://x.test/a.png')).toBe('type');
    expect(feedbackScreenshotRejection('data:image/png;base64,AAAA', 10)).toBe(
      'size',
    );
  });
});

describe('the fan picker checks', () => {
  it('takes only the allowed types, in any case', () => {
    expect(isFeedbackScreenshotType('image/gif')).toBe(true);
    expect(isFeedbackScreenshotType('IMAGE/JPEG')).toBe(true);
    expect(isFeedbackScreenshotType('image/svg+xml')).toBe(false);
    expect(isFeedbackScreenshotType('image/heic')).toBe(false);
    expect(isFeedbackScreenshotType('')).toBe(false);
  });

  it('caps the file so its data URL always fits the write cap', () => {
    for (const type of FEEDBACK_SCREENSHOT_TYPES) {
      const prefix = `data:${type};base64,`;
      const base64Chars = Math.ceil(MAX_FEEDBACK_SCREENSHOT_BYTES / 3) * 4;
      expect(prefix.length + base64Chars).toBeLessThanOrEqual(
        MAX_FEEDBACK_SCREENSHOT_CHARS,
      );
    }
    expect(MAX_FEEDBACK_SCREENSHOT_BYTES).toBeGreaterThan(5_900_000);
  });
});

describe('feedbackScreenshotOf', () => {
  it('honours a tighter cap, as the Needs you queue reads', () => {
    const big = `data:image/png;base64,${'A'.repeat(MAX_QUEUE_SCREENSHOT_CHARS)}`;
    expect(feedbackScreenshotOf({ screenshot: big })).toBe(big);
    expect(
      feedbackScreenshotOf({ screenshot: big }, MAX_QUEUE_SCREENSHOT_CHARS),
    ).toBeNull();
  });

  it('reads screenshot, then the legacy screenshotDataUrl', () => {
    expect(
      feedbackScreenshotOf({ screenshot: 'data:image/png;base64,AAAA' }),
    ).toBe('data:image/png;base64,AAAA');
    expect(
      feedbackScreenshotOf({ screenshotDataUrl: 'data:image/png;base64,BBBB' }),
    ).toBe('data:image/png;base64,BBBB');
  });

  it('returns null for a foreign value in either key, or no metadata', () => {
    expect(
      feedbackScreenshotOf({
        screenshot: 'https://tracker.example.com/a.png',
        screenshotDataUrl: 'https://tracker.example.com/b.png',
      }),
    ).toBeNull();
    expect(feedbackScreenshotOf(null)).toBeNull();
    expect(feedbackScreenshotOf('data:image/png;base64,AAAA')).toBeNull();
  });
});
