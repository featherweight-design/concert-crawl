// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { GoingButton } from './GoingButton';
import { GOING_COPY } from './definitions/copy';
import { pillInkFor } from './lib/pill-ink';
import { ThemeProvider } from '@/theme';

const SHOW = {
  eventId: 'ev1',
  artist: 'Khruangbin',
  date: '2026-10-14',
  venueSlug: 'the-church-nightclub',
  venueName: 'The Church Nightclub',
};

// The Church on `addendum-3/04/event-past-d`: fill and rings #FF6B8A (its
// `to`), glyph #A075FF (its `from`).
const CHURCH_RING = '#FF6B8A';
const CHURCH_GLYPH = '#A075FF';

describe('GoingButton', () => {
  afterEach(cleanup);

  it('renders the commitment copy by default, exclamation included', () => {
    render(<GoingButton show={SHOW} />);
    expect(screen.getByRole('button')).toHaveTextContent("I'm going!");
  });

  it('renders the going copy and sets aria-pressed', () => {
    render(<GoingButton show={SHOW} state="going" />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent(GOING_COPY.button.going);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('is not pressed in the default state', () => {
    render(<GoingButton show={SHOW} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('omits aria-pressed on a stamped night and reads "I went" as off', () => {
    render(<GoingButton show={SHOW} state="past-yes" />);
    expect(screen.getByRole('button').hasAttribute('aria-pressed')).toBe(false);
    cleanup();
    render(<GoingButton show={SHOW} state="past-no" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('names the "I went" pill with the artist and date', () => {
    render(<GoingButton show={SHOW} state="past-no" />);
    expect(screen.getByRole('button')).toHaveAccessibleName(
      GOING_COPY.past.ariaWent('Khruangbin', 'Oct 14, 2026'),
    );
  });

  // event_unmarked_m: the dashed ghost of the venue's stamp until the night is
  // stamped; the filled stub's own stamp is the solid VenueStamp (addendum 4
  // item 8 (PR #311)).
  it('draws the venue stamp as a dashed ghost on an unstamped night', () => {
    const { container } = render(<GoingButton show={SHOW} state="past-no" />);
    expect(
      container.querySelector('[data-venue-stamp="dashed"]'),
    ).not.toBeNull();
  });

  // event_stamped_m: the filled bar carries a ✓ and the board's 800 weight.
  it('draws a ✓ and the 800 weight on a stamped night', () => {
    render(<GoingButton show={SHOW} state="past-yes" />);
    const button = screen.getByRole('button');
    expect(button.querySelector('svg path[d^="M20 6"]')).not.toBeNull();
    expect(button.style.fontWeight).toBe('800');
  });

  it('carries the focus-ring class that restores :focus-visible', () => {
    render(<GoingButton show={SHOW} />);
    expect(screen.getByRole('button').classList.contains('going-cta')).toBe(
      true,
    );
  });

  it('renders the show date in past-yes, not the tap date', () => {
    render(<GoingButton show={SHOW} state="past-yes" />);
    expect(screen.getByRole('button')).toHaveTextContent(
      'You went · Wed, Oct 14',
    );
  });

  it('renders "I went" in past-no', () => {
    render(<GoingButton show={SHOW} state="past-no" />);
    expect(screen.getByRole('button')).toHaveTextContent('I went');
  });

  it('reports going=true when the "I went" pill is tapped', () => {
    const onChange = vi.fn();
    render(<GoingButton show={SHOW} state="past-no" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reports going=true when tapped from default', () => {
    const onChange = vi.fn();
    render(<GoingButton show={SHOW} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reports going=false when tapped while going', () => {
    const onChange = vi.fn();
    render(<GoingButton show={SHOW} state="going" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('past-yes is a read-only display, not an affordance', () => {
    const onChange = vi.fn();
    render(<GoingButton show={SHOW} state="past-yes" onChange={onChange} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onChange).not.toHaveBeenCalled();
  });

  // Blocks a second tap but stays undimmed: the caller commits optimistically,
  // so dimming here would undo the point of the optimistic state.
  it('blocks a second tap while pending without dimming', () => {
    const onChange = vi.fn();
    render(<GoingButton show={SHOW} pending onChange={onChange} />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.style.opacity).toBe('1');
    fireEvent.click(button);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('announces the commitment on transition into going', () => {
    const { rerender } = render(<GoingButton show={SHOW} />);
    expect(screen.getByRole('status').textContent).toBe('');
    rerender(<GoingButton show={SHOW} state="going" />);
    expect(screen.getByRole('status').textContent).toBe(
      GOING_COPY.button.stateChangeGoing,
    );
  });

  it('announces the release on transition out of going', () => {
    const { rerender } = render(<GoingButton show={SHOW} state="going" />);
    rerender(<GoingButton show={SHOW} state="default" />);
    expect(screen.getByRole('status').textContent).toBe(
      GOING_COPY.button.stateChangeReleased,
    );
  });

  // Landing on a past show you already attended is not something the user just
  // did, so it must not be announced.
  it('stays silent when mounted straight into going', () => {
    render(<GoingButton show={SHOW} state="going" />);
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it.each(['sm', 'md', 'lg'] as const)(
    'meets the 44px tap target at size %s',
    (size) => {
      render(<GoingButton show={SHOW} size={size} />);
      const button = screen.getByRole('button');
      const drawn = parseFloat(button.style.height);
      if (drawn >= 44) return;
      // Below 44 the hit area is extended by an overflowing overlay child.
      const overlay = button.querySelector('span[aria-hidden="true"]');
      expect(overlay).not.toBeNull();
      const pad = Math.abs(parseFloat((overlay as HTMLElement).style.top));
      expect(drawn + pad * 2).toBeGreaterThanOrEqual(44);
    },
  );

  it('leaves the uncommitted stub unfilled', () => {
    const { container } = render(<GoingButton show={SHOW} />);
    const button = container.querySelector('button');
    expect(container.querySelector('[data-venue-stamp]')).toBeNull();
    expect(button?.style.background).toBe('var(--surface-1)');
    expect(button?.style.border).toContain('var(--border-strong)');
  });

  // Both committed states fill with the venue's ring colour, exactly. The
  // expected values go through a reference element so jsdom normalises the
  // hex the same way it normalises the button's.
  it.each(['going', 'past-yes'] as const)(
    'fills %s with the venue ring colour',
    (state) => {
      const reference = document.createElement('span');
      reference.style.background = CHURCH_RING;
      reference.style.border = `1.5px solid ${CHURCH_RING}`;
      const { container } = render(<GoingButton show={SHOW} state={state} />);
      const button = container.querySelector('button');
      expect(button?.style.background).toBe(reference.style.background);
      expect(button?.style.border).toBe(reference.style.border);
    },
  );

  // On Light, white `--fg-on-accent` on The Church's #FF6B8A is about 2.7:1,
  // under AA. Both committed states take the contrast-picked ink instead.
  it.each(['going', 'past-yes'] as const)(
    'inks %s by contrast on Light, never --fg-on-accent',
    (state) => {
      document.documentElement.setAttribute('data-theme', 'light');
      try {
        render(
          <ThemeProvider>
            <GoingButton show={SHOW} state={state} />
          </ThemeProvider>,
        );
        const color = screen.getByRole('button').style.color;
        expect(color).toBe(pillInkFor(CHURCH_RING, 'light').text);
        expect(color).toBe('var(--fg)');
      } finally {
        document.documentElement.removeAttribute('data-theme');
      }
    },
  );

  // The bug Hugh reported: the stub took the artist's colour, so two nights
  // at one venue drew two different stamps.
  it.each(['going', 'past-yes'] as const)(
    'gives two artists at one venue the same colours (%s)',
    (state) => {
      const paint = (artist: string) => {
        const { container } = render(
          <GoingButton show={{ ...SHOW, artist }} state={state} />,
        );
        const button = container.querySelector('button');
        const result = {
          fill: button?.style.background,
          ring: container
            .querySelector('[data-venue-stamp-ring]')
            ?.getAttribute('stroke'),
          glyph: container
            .querySelector('[data-venue-glyph] > g')
            ?.getAttribute('stroke'),
        };
        cleanup();
        return result;
      };
      const first = paint('TOKiMONSTA');
      const second = paint('Khruangbin');
      expect(first.ring).toBe(CHURCH_RING);
      expect(first.glyph).toBe(CHURCH_GLYPH);
      const reference = document.createElement('span');
      reference.style.background = CHURCH_RING;
      expect(first.fill).toBe(reference.style.background);
      expect(second).toEqual(first);
    },
  );

  // `event-past-d` for the stub: a 50px stub, a 50px dark hole behind a
  // dashed perforation, a 36px stamp, and dark ink. The stamp itself is the
  // round VenueStamp (design/design_handoff_bplus_redesign/README.md rule 4,
  // and addendum 4 item 8 (PR #311)), never the board's rounded square.
  it.each(['going', 'past-yes'] as const)(
    "draws the committed stub as the board's, with the round stamp (%s)",
    (state) => {
      const { container } = render(
        <GoingButton show={SHOW} state={state} size="lg" />,
      );
      const button = container.querySelector('button');
      expect(button?.style.height).toBe('50px');
      expect(button?.style.borderRadius).toBe('10px');
      expect(button?.style.color).toBe('var(--bg)');

      const hole = container.querySelector<HTMLElement>(
        '[data-going-cta-hole]',
      );
      expect(hole?.style.width).toBe('50px');
      expect(hole?.style.background).toBe('var(--bg)');
      expect(hole?.style.borderRight).toContain('dashed');

      // Exactly one stamp in the hole: the solid VenueStamp. Its geometry is
      // VenueStamp's own and is tested in VenueStamp.test.tsx.
      expect(container.querySelectorAll('[data-venue-stamp]')).toHaveLength(1);
      const stamp = hole?.querySelector<HTMLElement>(
        '[data-venue-stamp="solid"]',
      );
      expect(stamp?.style.width).toBe('36px');
      expect(stamp?.style.height).toBe('36px');
      expect(
        stamp
          ?.querySelector('[data-venue-glyph]')
          ?.getAttribute('data-venue-glyph'),
      ).toBe('church');
    },
  );

  // Only `lg` renders in the app today (EventDetailCtaBlock), but every size
  // fills its hole with the same solid stamp at the hole's size.
  it.each([
    ['sm', '28px'],
    ['md', '32px'],
    ['lg', '36px'],
  ] as const)('sizes the stamp to the %s hole (%s)', (size, px) => {
    const { container } = render(
      <GoingButton show={SHOW} state="past-yes" size={size} />,
    );
    expect(container.querySelectorAll('[data-venue-stamp]')).toHaveLength(1);
    const stamp = container.querySelector<HTMLElement>(
      '[data-going-cta-hole] [data-venue-stamp="solid"]',
    );
    expect(stamp?.style.width).toBe(px);
    expect(stamp?.style.height).toBe(px);
  });

  // Tilt is the Passport booklet's alone: the stub's stamp sits straight.
  it('never tilts the stub stamp', () => {
    const { container } = render(
      <GoingButton show={SHOW} state="past-yes" size="lg" />,
    );
    const hole = container.querySelector('[data-going-cta-hole]');
    if (!hole) throw new Error('no stub hole rendered');
    expect(hole.querySelector('[data-venue-stamp="solid"]')).not.toBeNull();
    const nodes = [hole, ...hole.querySelectorAll('*')];
    for (const node of nodes) {
      expect(node.hasAttribute('transform')).toBe(false);
      expect(node.getAttribute('style') ?? '').not.toMatch(/rotate|transform/);
    }
  });

  it('falls back to the venue art in the stamp for a venue with no glyph', () => {
    const { container } = render(
      <GoingButton
        show={{ ...SHOW, venueSlug: 'no-such-venue', venueName: 'Somewhere' }}
        state="going"
      />,
    );
    expect(container.querySelector('[data-venue-glyph]')).toBeNull();
    expect(
      container.querySelector('[data-venue-stamp-fallback]'),
    ).not.toBeNull();
  });
});
