// @vitest-environment jsdom

import { render, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FollowDateLine } from './FollowDateLine';
import { FOLLOWING_COPY } from './definitions/copy';

const SEP = FOLLOWING_COPY.cardDateSeparator;

describe('FollowDateLine', () => {
  afterEach(cleanup);

  // The whole point of the component. A single ellipsised span drops the tail,
  // and the tail is the date — the only part of this line a user can act on.
  it('lets the venue shrink and pins the date', () => {
    const { container } = render(
      <FollowDateLine
        dateLine={`Red Rocks Amphitheatre${SEP}Aug 10`}
        fallback="No dates announced"
      />,
    );

    const [venue, date] = Array.from(container.querySelectorAll('span > span'));
    expect(venue?.textContent).toBe('Red Rocks Amphitheatre');
    expect(venue?.className).toContain('text-ellipsis');
    // A flex item's automatic minimum size is its content. Without min-w-0
    // the venue will not shrink, and it pushes the date out of the box —
    // which is the bug, wearing a different hat.
    expect(venue?.className).toContain('min-w-0');
    expect(date?.textContent).toBe(`${SEP}Aug 10`);
    expect(date?.className).toContain('shrink-0');
    expect(date?.className).not.toContain('text-ellipsis');
  });

  // The date half starts with the separator's own space. `nowrap` collapses
  // it in a flex item, which drew "Marquis Theater· Nov 13".
  it('keeps the space before the dot', () => {
    const { container } = render(
      <FollowDateLine
        dateLine={`Marquis Theater${SEP}Nov 13`}
        fallback="No dates announced"
      />,
    );

    const [, date] = Array.from(container.querySelectorAll('span > span'));
    expect(date?.className).toContain('whitespace-pre');
  });

  // The shelf card (`shelf-see-all-m`): the venue on the left, two lines at
  // most, and the date in a column of its own with no separator.
  it('sets the venue and the date in two columns when asked', () => {
    const { container } = render(
      <FollowDateLine
        dateLine={`Marquis Theater${SEP}Nov 13`}
        fallback="No dates announced"
        layout="columns"
      />,
    );

    const [venue, date] = Array.from(container.querySelectorAll('span > span'));
    expect(venue?.textContent).toBe('Marquis Theater');
    expect(venue?.className).toContain('line-clamp-2');
    expect(date?.textContent).toBe('Nov 13');
    expect(date?.className).toContain('shrink-0');
  });

  // A venue with its own separator must not steal the split.
  it('splits on the last separator, not the first', () => {
    const { container } = render(
      <FollowDateLine
        dateLine={`Ogden${SEP}Denver${SEP}Sep 5`}
        fallback="No dates announced"
      />,
    );

    const [venue, date] = Array.from(container.querySelectorAll('span > span'));
    expect(venue?.textContent).toBe(`Ogden${SEP}Denver`);
    expect(date?.textContent).toBe(`${SEP}Sep 5`);
  });

  it('renders the fallback whole when there is no date', () => {
    const { container } = render(
      <FollowDateLine dateLine={null} fallback="No dates announced" />,
    );

    expect(container.textContent).toBe('No dates announced');
    expect(container.querySelectorAll('span > span')).toHaveLength(0);
  });
});
