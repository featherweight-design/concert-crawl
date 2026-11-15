import { describe, expect, it } from 'vitest';
import {
  MAX_FEEDBACK_SCREENSHOT_CHARS,
  feedbackScreenshotOf,
  isFeedbackScreenshot,
} from './feedback-screenshot.js';

describe('isFeedbackScreenshot', () => {
  it.each([
    'data:image/png;base64,AAAA',
    'data:image/jpeg;base64,/9j/4AAQ',
    'data:image/webp;base64,UklGRg==',
  ])('keeps an inline raster image: %s', (value) => {
    expect(isFeedbackScreenshot(value)).toBe(true);
  });

  it.each([
    'https://tracker.example.com/pixel.png',
    'http://169.254.169.254/latest',
    '//tracker.example.com/pixel.png',
    'javascript:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
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

describe('feedbackScreenshotOf', () => {
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
