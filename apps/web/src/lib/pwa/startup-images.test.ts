import { describe, expect, it } from 'vitest';
import {
  STARTUP_SIZES,
  findStartupSize,
  startupImageLinks,
  startupMedia,
  startupSizeKey,
} from './startup-images';

describe('startup images', () => {
  it('has a distinct key and media query for every size', () => {
    const keys = STARTUP_SIZES.map(startupSizeKey);
    expect(new Set(keys).size).toBe(keys.length);
    const medias = STARTUP_SIZES.map(startupMedia);
    expect(new Set(medias).size).toBe(medias.length);
  });

  it('keeps device pixels equal to CSS pixels times the ratio', () => {
    for (const size of STARTUP_SIZES) {
      expect(size.width).toBe(size.cssWidth * size.ratio);
      expect(size.height).toBe(size.cssHeight * size.ratio);
    }
  });

  it('links each size to its own route and resolves it back', () => {
    for (const link of startupImageLinks()) {
      const key = link.url.split('/').pop() ?? '';
      expect(findStartupSize(key)).toBeDefined();
    }
    expect(findStartupSize('1x1')).toBeUndefined();
  });
});
