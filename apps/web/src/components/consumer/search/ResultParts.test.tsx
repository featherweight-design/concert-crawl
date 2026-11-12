// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Highlight, VenueDateLine } from './ResultParts';

afterEach(cleanup);

const lit = (text: string, query: string): string | null => {
  const { container } = render(<Highlight text={text} query={query} />);
  return container.querySelector('span')?.textContent ?? null;
};

describe('Highlight', () => {
  it('lights the first case-insensitive match', () => {
    expect(lit('Clipse & J.I.D', 'clip')).toBe('Clip');
  });

  it('lights the right characters when lowercasing changes the length', () => {
    // 'İ'.toLowerCase() is two code units, which shifts every later offset.
    expect(lit('İstanbul Orchestra', 'orch')).toBe('Orch');
  });

  it('treats the query as literal text, not a pattern', () => {
    expect(lit('50% Off Night', '50%')).toBe('50%');
    expect(lit('Anything', '.*')).toBeNull();
  });

  it('is plain text with no query or no match', () => {
    expect(lit('Idles', '')).toBeNull();
    expect(lit('Idles', 'zzz')).toBeNull();
  });
});

describe('VenueDateLine', () => {
  it('keeps the date whole and lets the venue give way', () => {
    const { container } = render(
      <VenueDateLine venue="Marquis Theater" date="Fri, Nov 13" />,
    );
    const [venue, date] = Array.from(container.querySelectorAll('span > span'));
    expect(venue?.textContent).toBe('Marquis Theater');
    expect(date?.textContent).toBe(' · Fri, Nov 13');
    expect((date as HTMLElement).style.flexShrink).toBe('0');
    expect((venue as HTMLElement).style.textOverflow).toBe('ellipsis');
  });
});
