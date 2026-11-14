// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { EventRow } from './EventRow';
import type { EventRowShow } from './lib/row-model';
import { rowChips } from './lib/row-chips';
import { EVENT_ROW_COPY } from './definitions/copy';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// jsdom has no layout engine, so the measure passes see a zero-width box and
// fall through to their pre-layout defaults (the ResizeObserver stub lives in
// the shared test setup). That is the behaviour asserted here; the geometry
// itself is covered by the pure helpers.
afterEach(() => {
  cleanup();
});

function makeShow(partial: Partial<EventRowShow> = {}): EventRowShow {
  return {
    id: 'evt-1',
    headliner: 'Test Artist',
    fallbackTitle: 'Test Artist at Test Ballroom',
    supports: [],
    tourName: null,
    imageUrl: null,
    artistPhotoUrl: null,
    venueName: 'Test',
    venueSlug: 'test',
    dateLabel: 'Sat, Aug 15',
    timeLabel: '8:00 PM',
    price: {
      amount: 68,
      isFloor: true,
      source: null,
      isPending: false,
    },
    saved: null,
    genres: [],
    isFollowed: false,
    crewGoing: null,
    isWatching: false,
    status: 'live',
    lifecycle: 'upcoming',
    delistedAt: null,
    ...partial,
  };
}

describe('EventRow — focus and hover on the row link', () => {
  // jsdom loads no stylesheet, so the ring is asserted in two halves: the row
  // link carries the hook, and globals.css draws the app's ring from it.
  const css = readFileSync(
    resolve(__dirname, '../../../app/globals.css'),
    'utf8',
  ).replace(/\s+/g, ' ');

  it('rings a keyboard-focused row with the app focus style', () => {
    render(<EventRow show={makeShow()} surface="browse" />);
    const link = screen.getByRole('link', { name: /Test Artist/ });
    expect(link.className).toContain('event-row-stretch');
    expect(css).toContain(
      '.event-row-stretch:focus-visible::after { outline: 2px solid var(--focus); outline-offset: 2px;',
    );
  });

  it.each(['browse', 'venue', 'watching'] as const)(
    'gives a carded %s row no title hover tint',
    (surface) => {
      render(<EventRow show={makeShow()} surface={surface} />);
      expect(screen.getByTestId('row-title').className).not.toContain('signal');
    },
  );

  it('keeps the hover tint on an uncarded row', () => {
    render(<EventRow show={makeShow()} surface="related" />);
    expect(screen.getByTestId('row-title').className).toContain(
      'group-hover/eventtitle:text-signal',
    );
  });
});

describe('EventRow — Rule 1, context subtraction', () => {
  it('drops the date on Browse, which states it in the group header', () => {
    render(<EventRow show={makeShow()} surface="browse" />);
    expect(screen.getByTestId('when-where').textContent).not.toContain(
      'Aug 15',
    );
    expect(screen.getByTestId('when-where').textContent).toContain('8:00 PM');
  });

  it('drops the venue on a venue page, which is the venue', () => {
    render(<EventRow show={makeShow()} surface="venue" />);
    expect(screen.queryByTestId('venue-name-link')).toBeNull();
    expect(screen.getByTestId('when-where').textContent).toContain('Aug 15');
  });

  it('keeps all three units on Watching, whose headers are loose windows', () => {
    render(<EventRow show={makeShow()} surface="watching" />);
    const line = screen.getByTestId('when-where').textContent ?? '';
    expect(line).toContain('Aug 15');
    expect(line).toContain('8:00 PM');
    expect(screen.getByTestId('venue-name-link')).not.toBeNull();
  });
});

describe('EventRow — the row is a link, not a click handler', () => {
  it('gives the row one stretched anchor named by the artist', () => {
    render(<EventRow show={makeShow()} surface="browse" />);
    const stretch = document.querySelector('a.event-row-stretch');
    expect(stretch?.getAttribute('href')).toBe('/events/evt-1');
    expect(stretch?.textContent).toContain('Test Artist');
  });
});

describe('EventRow — watching is a report, not an action', () => {
  it('renders a non-interactive tick, never a button', () => {
    render(<EventRow show={makeShow({ isWatching: true })} surface="browse" />);
    const tick = screen.getByTestId('row-watching-tick');
    expect(tick.getAttribute('role')).toBe('img');
    expect(tick.getAttribute('aria-label')).toBe(
      'You are watching Test Artist',
    );
    expect(document.querySelector('button')).toBeNull();
  });

  it('renders the tick as an accent dot overhanging the artwork corner', () => {
    render(<EventRow show={makeShow({ isWatching: true })} surface="browse" />);
    const tick = screen.getByTestId('row-watching-tick');
    expect(tick.className).toContain('bg-accent');
    expect(tick.className).toContain('rounded-full');
    expect(tick.style.top).toBe('-3px');
    expect(tick.style.right).toBe('-3px');
    // An icon here is the regression: watching reports state, and --signal
    // belongs to the Following chip.
    expect(tick.querySelector('svg')).toBeNull();
  });

  it('leaves the artwork clip box unable to crop the overhanging tick', () => {
    render(<EventRow show={makeShow({ isWatching: true })} surface="browse" />);
    const tick = screen.getByTestId('row-watching-tick');
    expect(tick.parentElement?.className).not.toContain('overflow-hidden');
  });

  it('renders no tick at all when the show is not watched', () => {
    render(<EventRow show={makeShow()} surface="browse" />);
    expect(screen.queryByTestId('row-watching-tick')).toBeNull();
  });
});

describe('EventRow — the price slot', () => {
  it('prefixes a floor price with "from"', () => {
    render(<EventRow show={makeShow()} surface="browse" />);
    expect(screen.getByText('from')).not.toBeNull();
    expect(screen.getByText('$68')).not.toBeNull();
  });

  it('drops the "from" on a free floor, which would read "from Free"', () => {
    render(
      <EventRow
        show={makeShow({
          price: {
            amount: 0,
            isFloor: true,
            source: null,
            isPending: false,
          },
        })}
        surface="browse"
      />,
    );
    expect(screen.queryByText('from')).toBeNull();
  });

  it('says tba rather than nothing when there is no price', () => {
    render(<EventRow show={makeShow({ price: null })} surface="browse" />);
    expect(screen.getByText('tba')).not.toBeNull();
  });

  it('suppresses the price on a cancelled show', () => {
    render(
      <EventRow show={makeShow({ lifecycle: 'cancelled' })} surface="browse" />,
    );
    expect(screen.queryByText('$68')).toBeNull();
  });

  it('takes the whole slot when sold out, spending no chip budget', () => {
    render(
      <EventRow
        show={makeShow({ status: 'soldout', isFollowed: true })}
        surface="browse"
      />,
    );
    expect(screen.queryByText('$68')).toBeNull();
    // The Following chip still gets its slot — sold out is not a meta chip.
    expect(screen.getByTestId('row-meta').textContent).toContain('Following');
  });

  // B+ rows board: the chip sits inline after the headliner, and the price
  // slot holds a lone dash with a spoken label.
  it('sets the sold-out chip on the title line and dashes the price', () => {
    render(
      <EventRow show={makeShow({ status: 'soldout' })} surface="browse" />,
    );
    const chip = screen.getByTestId('row-sold-out');
    expect(screen.getByTestId('row-title-line').contains(chip)).toBe(true);
    expect(chip.textContent).toContain('Sold out');
    const price = screen.getByTestId('row-sold-out-price');
    expect(price.textContent).toContain('—');
    expect(price.textContent).toContain('No price, sold out');
    expect(price.contains(chip)).toBe(false);
  });

  it('drops the tour clause while the sold-out chip holds the title line', () => {
    render(
      <EventRow
        show={makeShow({ status: 'soldout', tourName: 'Night Drive' })}
        surface="browse"
      />,
    );
    expect(screen.queryByTestId('row-tour-clause')).toBeNull();
  });

  it('shows the saved-price delta on Watching only', () => {
    const show = makeShow({ saved: { at: '2026-07-01', price: 80 } });
    const { rerender } = render(<EventRow show={show} surface="watching" />);
    expect(screen.getByTestId('row-price-delta').textContent).toContain('$12');

    // Browse fixtures do carry a saved price; gating on data would turn a
    // Browse price green for a show the user never saved.
    rerender(<EventRow show={show} surface="browse" />);
    expect(screen.queryByTestId('row-price-delta')).toBeNull();
  });

  it('reports a dollar-or-two move as flat rather than as an arrow', () => {
    render(
      <EventRow
        show={makeShow({ saved: { at: '2026-07-01', price: 69 } })}
        surface="watching"
      />,
    );
    expect(screen.getByTestId('row-price-flat')).not.toBeNull();
    expect(screen.queryByTestId('row-price-delta')).toBeNull();
  });

  it('marks an unconfirmed price rather than rendering it bare', () => {
    const price = { amount: 68, isFloor: true, source: null };
    const { rerender } = render(
      <EventRow
        show={makeShow({ price: { ...price, isPending: true } })}
        surface="browse"
      />,
    );
    // The number still reads — an unconfirmed price the reader can sanity-check
    // is the point of showing it at all.
    expect(screen.getByText('$68')).not.toBeNull();
    expect(screen.getByTestId('row-price-pending')).not.toBeNull();

    rerender(
      <EventRow
        show={makeShow({ price: { ...price, isPending: false } })}
        surface="browse"
      />,
    );
    expect(screen.queryByTestId('row-price-pending')).toBeNull();
  });
});

describe('EventRow — lifecycle beats the price state', () => {
  it('reads Cancelled, not Sold out, on a show that is both', () => {
    // The live production bug: the old slot asked `soldout` first, so a
    // cancelled sold-out show told the reader to arrive and find a locked door.
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled', status: 'soldout' })}
        surface="watching"
      />,
    );
    expect(screen.getByTestId('row-cancelled')).not.toBeNull();
    expect(screen.queryByTestId('row-sold-out')).toBeNull();
    expect(screen.getByTestId('row-cancelled').textContent).toContain(
      'Cancelled',
    );
  });

  // `more-st-rows_board`: the chip sits beside the name for every status, the
  // slot holds a dash where there is nothing to buy, and a postponed show
  // keeps its price and says "Date TBA".
  it('sets Cancelled beside the name and dashes the price', () => {
    render(
      <EventRow show={makeShow({ lifecycle: 'cancelled' })} surface="browse" />,
    );
    expect(
      screen
        .getByTestId('row-title-line')
        .contains(screen.getByTestId('row-cancelled')),
    ).toBe(true);
    expect(screen.getByTestId('row-no-price').textContent).toContain(
      'No price, cancelled',
    );
  });

  it('sets Postponed beside the name, keeps the price and says Date TBA', () => {
    render(
      <EventRow show={makeShow({ lifecycle: 'postponed' })} surface="browse" />,
    );
    expect(
      screen
        .getByTestId('row-title-line')
        .contains(screen.getByTestId('row-postponed')),
    ).toBe(true);
    expect(screen.queryByTestId('row-no-price')).toBeNull();
    expect(screen.getByText(/\$\d/)).not.toBeNull();
    expect(screen.getByText('Date TBA')).not.toBeNull();
  });

  it('reads Postponed, not Sold out, on a show that is both', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'postponed', status: 'soldout' })}
        surface="watching"
      />,
    );
    expect(screen.getByTestId('row-postponed')).not.toBeNull();
    expect(screen.queryByTestId('row-sold-out')).toBeNull();
  });

  it('names the state for a screen reader instead of the bare chip word', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled' })}
        surface="watching"
      />,
    );
    expect(
      screen.getByText('This show has been cancelled').className,
    ).toContain('sr-only');
  });

  it('spends no chip budget, so the meta chips still render', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled', isFollowed: true })}
        surface="browse"
      />,
    );
    expect(screen.getByTestId('row-meta').textContent).toContain('Following');
  });
});

describe('EventRow — the three signals a suppressed row carries', () => {
  // B+ rows board: a cancelled row strikes and dims its headliner and leaves
  // the date line alone.
  it('strikes the headliner of a cancelled show, never line 3', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled' })}
        surface="watching"
      />,
    );
    expect(screen.getByTestId('row-title').style.textDecoration).toBe(
      'line-through',
    );
    const line = screen.getByTestId('when-where');
    expect(
      Array.from(line.querySelectorAll('span')).filter(
        (node) => node.style.textDecoration === 'line-through',
      ),
    ).toHaveLength(0);
    expect(screen.getByTestId('venue-name-link').style.textDecoration).toBe('');
    // The state is still named in words for a screen reader.
    expect(screen.getByText('This show has been cancelled')).toBeTruthy();
  });

  // Postponed still happens on another night, so nothing is struck.
  it('strikes nothing on a postponed show', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'postponed' })}
        surface="watching"
      />,
    );
    expect(screen.getByTestId('row-title').style.textDecoration).toBe('');
    const line = screen.getByTestId('when-where');
    expect(
      Array.from(line.querySelectorAll('span')).filter(
        (node) => node.style.textDecoration === 'line-through',
      ),
    ).toHaveLength(0);
  });

  it('leaves line 3 unstruck on a sold-out show, which is still happening', () => {
    render(
      <EventRow show={makeShow({ status: 'soldout' })} surface="watching" />,
    );
    const line = screen.getByTestId('when-where');
    expect(
      Array.from(line.querySelectorAll('span')).filter(
        (node) => node.style.textDecoration === 'line-through',
      ),
    ).toHaveLength(0);
  });

  it('dims the artwork rather than the row, which would fail AA', () => {
    render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled' })}
        surface="watching"
      />,
    );
    const art = screen
      .getByTestId('event-row')
      .querySelector('.overflow-hidden');
    expect(art?.getAttribute('style')).toContain('opacity: 0.55');
    expect(screen.getByTestId('event-row').style.opacity).toBe('');
  });

  it('leaves the artwork at full strength on a sold-out show', () => {
    render(
      <EventRow show={makeShow({ status: 'soldout' })} surface="watching" />,
    );
    expect(screen.getByTestId('row-image-ring').style.opacity).toBe('1');
  });

  it('leaves the artwork at full strength on a live show', () => {
    render(<EventRow show={makeShow()} surface="watching" />);
    const art = screen
      .getByTestId('event-row')
      .querySelector('.overflow-hidden');
    expect(art?.getAttribute('style')).toContain('opacity: 1');
  });
});

describe('EventRow — the action gutter', () => {
  it('reserves no gutter on Browse, where 36px costs the title column', () => {
    render(
      <EventRow
        show={makeShow()}
        surface="browse"
        action={<button type="button">remove</button>}
      />,
    );
    expect(screen.queryByText('remove')).toBeNull();
  });

  it('renders the action on a surface that has one', () => {
    render(
      <EventRow
        show={makeShow()}
        surface="watching"
        action={<button type="button">remove</button>}
      />,
    );
    expect(screen.getByText('remove')).not.toBeNull();
  });

  // The B+ event board draws the watch eye at the right of every "More at"
  // row (`bp-m-event_m_end`).
  it('puts the related row action in the gutter', () => {
    render(
      <EventRow
        show={makeShow()}
        surface="related"
        action={<button type="button">watch</button>}
      />,
    );
    const gutter = screen.getByTestId('row-action-gutter');
    expect(gutter.contains(screen.getByText('watch'))).toBe(true);
    expect(gutter.style.width).toBe('36px');
  });

  // The signed-out event page renders no watch control. An empty 36px box
  // would cost its title column for nothing.
  it('reserves no gutter on a related row with no action', () => {
    render(<EventRow show={makeShow()} surface="related" />);
    expect(screen.queryByTestId('row-action-gutter')).toBeNull();
  });
});

describe('EventRow — artwork size', () => {
  const artBox = () => screen.getByTestId('row-image-ring').parentElement;

  function atWidth(width: number, run: () => void) {
    const spy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        width,
        height: 0,
        top: 0,
        left: 0,
        right: width,
        bottom: 0,
        toJSON: () => ({}),
      });
    try {
      run();
    } finally {
      spy.mockRestore();
    }
  }

  it('draws 56px art on a wide row', () => {
    atWidth(500, () => {
      render(<EventRow show={makeShow()} surface="related" />);
      expect(artBox()?.style.width).toBe('56px');
      expect(artBox()?.style.height).toBe('56px');
    });
  });

  // The board's related rows sit in a 358px column and keep the full tile.
  it('keeps 56px art on a narrow related row', () => {
    atWidth(358, () => {
      render(<EventRow show={makeShow()} surface="related" />);
      expect(screen.getByTestId('event-row').dataset.narrow).toBe('true');
      expect(artBox()?.style.width).toBe('56px');
      expect(artBox()?.style.height).toBe('56px');
    });
  });

  it('still shrinks the art to 44px on a narrow Browse row', () => {
    atWidth(358, () => {
      render(<EventRow show={makeShow()} surface="browse" />);
      expect(artBox()?.style.width).toBe('44px');
    });
  });

  it('rings the related art in the lead genre', () => {
    render(
      <EventRow show={makeShow({ genres: ['rock'] })} surface="related" />,
    );
    const ring = screen.getByTestId('row-image-ring').style.boxShadow;
    expect(ring).toContain('1.25px');
    expect(ring).toContain('var(--genre-rock)');
  });
});

describe('EventRow — the footer slot', () => {
  it('renders a footer outside the four-line contract', () => {
    render(
      <EventRow
        show={makeShow()}
        surface="watching"
        footer={<div data-testid="going-nudge" />}
      />,
    );
    expect(screen.getByTestId('going-nudge')).not.toBeNull();
  });
});

/**
 * Rule 3. The reservation is asserted on the resolved `min-height` rather than
 * on a measured box, because jsdom has no layout engine and every rendered
 * height would come back as zero — an assertion that would pass whether or not
 * the reservation existed at all.
 *
 * Watching's chips are `provenance` then `genre` (B+ dropped the Stale chip),
 * so its ladder runs from no chips to the full two-chip budget, as Browse's
 * does with `following` and `genre`. A Browse row with no genre is unreachable
 * in production, but it is the honest floor for this ladder.
 */
describe('EventRow — Rule 3, the row reserves its own height', () => {
  const minHeights = (
    surface: 'watching' | 'artist' | 'browse',
    shows: EventRowShow[],
  ) =>
    new Set(
      shows.map((show) => {
        cleanup();
        render(<EventRow show={show} surface={surface} />);
        return screen.getByTestId('event-row').style.minHeight;
      }),
    );

  const watchingLadder = [
    // No chips at all: a price with no corroborated source has no
    // provenance, and MetaRow renders nothing.
    makeShow({
      price: {
        amount: 68,
        isFloor: true,
        source: null,
        isPending: false,
      },
    }),
    // One chip, provenance, which is all this surface can carry. A row price
    // carries no age, so there is no Stale rung to add.
    makeShow({
      price: {
        amount: 68,
        isFloor: true,
        source: 'boxoffice',
        isPending: false,
      },
    }),
    // No price at all, so the price slot reads "tba" and provenance has
    // nothing to report.
    makeShow({ price: null }),
    // Genre alone: one chip.
    makeShow({ price: null, genres: ['jazz'] }),
    // Provenance and genre: the full two-chip budget.
    makeShow({
      genres: ['jazz'],
      price: {
        amount: 68,
        isFloor: true,
        source: 'boxoffice',
        isPending: false,
      },
    }),
  ];

  const browseLadder = [
    makeShow({ genres: [] }),
    makeShow({ genres: ['rock'] }),
    makeShow({ genres: ['rock'], isFollowed: true }),
  ];

  // Asserted on the chip builder rather than on the rendered line, which has no
  // widths to fit against under jsdom. Without this the height claims below
  // would hold just as well over identical rows.
  it('runs the Watching ladder from no chips to the full two-chip budget', () => {
    expect(
      watchingLadder.map((show) => rowChips(show, 'watching').length),
    ).toEqual([0, 1, 0, 1, 2]);
    // Provenance leads, as bp-watching draws it; genre follows.
    const full = watchingLadder[watchingLadder.length - 1] ?? makeShow();
    expect(rowChips(full, 'watching').map((chip) => chip.key)).toEqual([
      'provenance',
      'genre-jazz',
    ]);
  });

  it('runs the Browse ladder from no chips to the full two-chip budget', () => {
    expect(browseLadder.map((show) => rowChips(show, 'browse').length)).toEqual(
      [0, 1, 2],
    );
  });

  it('holds one height across a Watching list from no chips to the full budget', () => {
    expect(minHeights('watching', watchingLadder).size).toBe(1);
  });

  it('holds one height across a Browse list from no chips to the full budget', () => {
    expect(minHeights('browse', browseLadder).size).toBe(1);
  });

  it('reserves less on a surface that can never carry a support line', () => {
    // Watching and artist both declare `showsSupports: false`, so both take the
    // three-line reservation and a supports array they cannot render moves
    // neither of them.
    const withSupports = minHeights('watching', [
      makeShow({ supports: ['Opener One', 'Opener Two'] }),
    ]);
    const without = minHeights('watching', [makeShow()]);
    expect(withSupports).toEqual(without);
  });

  it('reserves the artist row at the same height as any other three-line row', () => {
    const artist = minHeights('artist', [
      makeShow({ tourName: 'Night Drive' }),
    ]);
    const watching = minHeights('watching', [makeShow()]);
    expect(artist).toEqual(watching);
  });

  // B+ rule 2: the lead genre colors the ring and the carded row's edge.
  describe('genre color', () => {
    it('rings the artwork in the lead genre color', () => {
      render(
        <EventRow
          show={makeShow({ genres: ['alternative', 'pop'] })}
          surface="browse"
        />,
      );
      expect(screen.getByTestId('row-image-ring').style.boxShadow).toContain(
        'var(--genre-rock)',
      );
    });

    it('edges a carded row in the lead genre color', () => {
      const { container } = render(
        <EventRow show={makeShow({ genres: ['jazz'] })} surface="watching" />,
      );
      const card = container.firstElementChild;
      if (!(card instanceof HTMLElement)) throw new Error('no card');
      expect(card.style.borderLeftColor).toBe('var(--genre-jazz)');
    });

    // B+ rule 3: a status takes the edge and wash; the ring keeps the genre.
    it.each([
      [{ lifecycle: 'cancelled' as const }, 'var(--danger)'],
      [{ lifecycle: 'postponed' as const }, 'var(--warning)'],
      [{ status: 'soldout' as const }, 'var(--accent)'],
    ])('edges a carded row %o in its status color', (partial, token) => {
      const { container } = render(
        <EventRow
          show={makeShow({ genres: ['jazz'], ...partial })}
          surface="watching"
        />,
      );
      const card = container.firstElementChild;
      if (!(card instanceof HTMLElement)) throw new Error('no card');
      expect(card.style.borderLeftColor).toBe(token);
      expect(card.getAttribute('style')).toContain(
        `color-mix(in oklch, ${token} 10%`,
      );
      expect(screen.getByTestId('row-image-ring').style.boxShadow).toContain(
        'var(--genre-jazz)',
      );
    });

    it('keeps the genre edge on a presale row, which has no show status', () => {
      const { container } = render(
        <EventRow
          show={makeShow({ genres: ['jazz'], status: 'presale' })}
          surface="watching"
        />,
      );
      const card = container.firstElementChild;
      if (!(card instanceof HTMLElement)) throw new Error('no card');
      expect(card.style.borderLeftColor).toBe('var(--genre-jazz)');
    });

    it('falls back to a neutral ring for an ungenred show', () => {
      render(<EventRow show={makeShow({ genres: [] })} surface="browse" />);
      expect(screen.getByTestId('row-image-ring').style.boxShadow).toContain(
        'var(--border-strong)',
      );
    });
  });

  // B+ B5: Browse rows are carded, so they take the genre edge too.
  it('cards a Browse row with the lead genre edge', () => {
    const { container } = render(
      <EventRow show={makeShow({ genres: ['folk'] })} surface="browse" />,
    );
    const card = container.firstElementChild;
    if (!(card instanceof HTMLElement)) throw new Error('no card');
    expect(card.style.borderLeftColor).toBe('var(--genre-folk)');
  });
});

describe('EventRow — No longer listed (A5)', () => {
  const removedShow = () =>
    makeShow({
      lifecycle: 'cancelled',
      delistedAt: '2026-11-04T10:00:00.000Z',
      genres: ['hip-hop'],
    });

  it('draws a dashed edge, no strike, and the source line', () => {
    const { container } = render(
      <EventRow show={removedShow()} surface="browse" />,
    );
    const row = container.querySelector<HTMLElement>(
      '[data-row-status="removed"]',
    );
    expect(row).not.toBeNull();
    expect(row?.className).toContain('border-dashed');
    // `nll-row-browse-d`: the date the venue dropped it, in Mountain Time.
    expect(screen.getByTestId('row-removed-line').textContent).toBe(
      EVENT_ROW_COPY.removedSince('Nov 4'),
    );
    expect(container.querySelector('[style*="line-through"]')).toBeNull();
    expect(container.querySelector('.line-through')).toBeNull();
  });

  // Addendum-3 `02/nll-row-browse-d`: a surface-1 card with a 1.5px dashed
  // border-strong edge, the photo in grayscale, and a mono 9px source line.
  it('draws the board card: surface-1 fill, 1.5px border-strong edge', () => {
    const { container } = render(
      <EventRow show={removedShow()} surface="browse" />,
    );
    const row = container.querySelector<HTMLElement>(
      '[data-row-status="removed"]',
    );
    expect(row?.className).toContain('bg-surface-1');
    expect(row?.style.background).toBe('');
    expect(row?.style.borderWidth).toBe('1.5px');
    expect(row?.style.borderColor).toBe('var(--border-strong)');
  });

  it('greys the artwork', () => {
    render(<EventRow show={removedShow()} surface="browse" />);
    expect(screen.getByTestId('row-image-ring').style.filter).toBe(
      'grayscale(1)',
    );
  });

  it('sets the source line in mono 9px caps', () => {
    render(<EventRow show={removedShow()} surface="browse" />);
    const line = screen.getByTestId('row-removed-line');
    expect(line.style.fontFamily).toBe('var(--font-mono)');
    expect(line.style.fontSize).toBe('9px');
    expect(line.style.letterSpacing).toBe('0.08em');
    expect(line.style.textTransform).toBe('uppercase');
    expect(line.className).toContain('text-fg-muted');
  });

  it('falls back to the explanation without a readable date', () => {
    render(
      <EventRow
        show={makeShow({
          lifecycle: 'cancelled',
          delistedAt: 'not-a-date',
        })}
        surface="browse"
      />,
    );
    expect(screen.getByTestId('row-removed-line').textContent).toBe(
      EVENT_ROW_COPY.removedLine,
    );
  });

  it('keeps colour on a listed row', () => {
    render(<EventRow show={makeShow({ genres: ['folk'] })} surface="browse" />);
    expect(screen.getByTestId('row-image-ring').style.filter).toBe('');
  });

  it('leaves a confirmed cancellation as a struck, non-removed row', () => {
    const { container } = render(
      <EventRow
        show={makeShow({ lifecycle: 'cancelled', delistedAt: null })}
        surface="browse"
      />,
    );
    expect(container.querySelector('[data-row-status]')).toBeNull();
    expect(screen.queryByTestId('row-removed-line')).toBeNull();
  });

  it('sets the chip beside the name on a wide row and dashes the price', () => {
    render(<EventRow show={removedShow()} surface="browse" />);
    const chip = screen.getByTestId('row-removed');
    expect(screen.getByTestId('row-title-line').contains(chip)).toBe(true);
    expect(screen.getByTestId('row-no-price').textContent).toContain(
      'No price, no longer listed',
    );
  });

  it('moves the chip under the title on a narrow row', () => {
    const spy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({ width: 300 } as DOMRect);
    try {
      render(<EventRow show={removedShow()} surface="browse" />);
      const textColumn = screen.getByTestId('row-removed-line').parentElement;
      expect(textColumn?.contains(screen.getByTestId('row-removed'))).toBe(
        true,
      );
    } finally {
      spy.mockRestore();
    }
  });
});
