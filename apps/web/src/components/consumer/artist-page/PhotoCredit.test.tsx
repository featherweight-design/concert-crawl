// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { PhotoCredit, type CommonsImage } from './PhotoCredit';

afterEach(cleanup);

const image: CommonsImage = {
  source: 'commons',
  url: 'https://upload.wikimedia.org/x.jpg',
  credit: 'Jane Photographer',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  fileUrl: 'https://commons.wikimedia.org/wiki/File:X.jpg',
};

const line = (value: CommonsImage) => {
  const { getByTestId } = render(<PhotoCredit image={value} />);
  return getByTestId('photo-credit');
};

describe('PhotoCredit', () => {
  it('reads Photo: author · licence · Wikimedia Commons, licence and file linked', () => {
    const el = line(image);
    expect(el.textContent).toBe(
      'Photo:Jane Photographer·CC BY-SA 4.0·Wikimedia Commons',
    );
    const hrefs = Array.from(el.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );
    expect(hrefs).toEqual([image.licenseUrl, image.fileUrl]);
  });

  it('drops the author segment for a null credit', () => {
    const el = line({ ...image, credit: null });
    expect(el.textContent).toBe('Photo:CC BY-SA 4.0·Wikimedia Commons');
    expect(el.querySelector('[data-testid="photo-credit-author"]')).toBeNull();
  });

  it('leaves the licence as text for a null licence link', () => {
    const el = line({ ...image, licenseUrl: null });
    const links = Array.from(el.querySelectorAll('a'));
    expect(links.map((link) => link.textContent)).toEqual([
      'Wikimedia Commons',
    ]);
    expect(el.textContent).toContain('CC BY-SA 4.0');
  });

  it('never links an unsafe scheme', () => {
    const el = line({ ...image, fileUrl: 'javascript:alert(1)' });
    expect(el.querySelectorAll('a[href^="javascript"]')).toHaveLength(0);
  });

  it('ellipsises only the author', () => {
    const el = line(image);
    const author = el.querySelector<HTMLElement>(
      '[data-testid="photo-credit-author"]',
    );
    expect(author?.style.textOverflow).toBe('ellipsis');
    const fixed = Array.from(el.querySelectorAll<HTMLElement>('a')).map(
      (link) => link.style.flex,
    );
    expect(fixed.every((flex) => flex.startsWith('none'))).toBe(true);
  });
});
