// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { GoingButton } from './GoingButton';
import { GOING_COPY } from './definitions/copy';

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

  it('omits aria-pressed in the read-only past states', () => {
    for (const state of ['past-yes', 'past-no'] as const) {
      render(<GoingButton show={SHOW} state={state} />);
      expect(screen.getByRole('button').hasAttribute('aria-pressed')).toBe(
        false,
      );
      cleanup();
    }
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
      'You went · Oct 14, 2026',
    );
  });

  it('renders the declined copy in past-no', () => {
    render(<GoingButton show={SHOW} state="past-no" />);
    expect(screen.getByRole('button')).toHaveTextContent("Didn't make it");
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

  it.each(['past-yes', 'past-no'] as const)(
    '%s is a read-only display, not an affordance',
    (state) => {
      const onChange = vi.fn();
      render(<GoingButton show={SHOW} state={state} onChange={onChange} />);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(onChange).not.toHaveBeenCalled();
    },
  );

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

  it('fills with the venue colour only once committed', () => {
    const { container: off } = render(<GoingButton show={SHOW} />);
    const offBorder = off.querySelector('button')!.style.border;
    expect(off.querySelector('[data-going-cta-stamp]')).toBeNull();
    cleanup();
    const { container: on } = render(<GoingButton show={SHOW} state="going" />);
    const onBorder = on.querySelector('button')!.style.border;
    expect(offBorder).toContain('var(--border-strong)');
    expect(onBorder).not.toBe(offBorder);
  });

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
            .querySelector('[data-going-cta-stamp-ring]')
            ?.getAttribute('stroke'),
          glyph: container
            .querySelector('[data-going-cta-stamp-glyph] > g')
            ?.getAttribute('stroke'),
        };
        cleanup();
        return result;
      };
      const first = paint('TOKiMONSTA');
      const second = paint('Khruangbin');
      expect(first.ring).toBe(CHURCH_RING);
      expect(first.glyph).toBe(CHURCH_GLYPH);
      expect(first.fill).not.toBe('');
      expect(second).toEqual(first);
    },
  );

  // `event-past-d`: a 50px stub, a 50px dark hole behind a dashed
  // perforation, a 36px double-ringed rounded square holding the glyph at
  // 40%, and dark ink.
  it("draws the committed stub as the board's", () => {
    const { container } = render(
      <GoingButton show={SHOW} state="going" size="lg" />,
    );
    const button = container.querySelector('button');
    expect(button?.style.height).toBe('50px');
    expect(button?.style.borderRadius).toBe('10px');
    expect(button?.style.color).toBe('var(--bg)');

    const hole = container.querySelector<HTMLElement>('[data-going-cta-hole]');
    expect(hole?.style.width).toBe('50px');
    expect(hole?.style.background).toBe('var(--bg)');
    expect(hole?.style.borderRight).toContain('dashed');

    const stamp = container.querySelector<HTMLElement>(
      '[data-going-cta-stamp]',
    );
    expect(stamp?.style.width).toBe('36px');
    const svg = stamp?.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 36 36');
    expect(svg?.style.filter).toContain(`${CHURCH_RING}4D`);

    const outer = container.querySelector('[data-going-cta-stamp-ring]');
    expect(outer?.tagName.toLowerCase()).toBe('rect');
    expect(outer?.getAttribute('x')).toBe('1.5');
    expect(outer?.getAttribute('width')).toBe('33');
    expect(outer?.getAttribute('rx')).toBe('7.2');
    expect(outer?.getAttribute('stroke-width')).toBe('2');
    expect(outer?.getAttribute('fill')).toBe('none');

    const inner = container.querySelector('[data-going-cta-stamp-inner-ring]');
    expect(inner?.getAttribute('x')).toBe('6');
    expect(inner?.getAttribute('width')).toBe('24');
    expect(inner?.getAttribute('rx')).toBe('4.7');
    expect(inner?.getAttribute('stroke-width')).toBe('0.9');
    expect(inner?.getAttribute('stroke-dasharray')).toBeNull();
    expect(inner?.getAttribute('stroke')).toBe(CHURCH_RING);

    const glyph = container.querySelector('[data-going-cta-stamp-glyph]');
    expect(glyph?.getAttribute('data-going-cta-stamp-glyph')).toBe('church');
    expect(glyph?.getAttribute('transform')).toBe(
      'translate(10.8 10.8) scale(0.6)',
    );
    expect(
      glyph?.querySelector(':scope > g')?.getAttribute('stroke-width'),
    ).toBe('1.8');
  });

  it('falls back to the venue art in the stamp for a venue with no glyph', () => {
    const { container } = render(
      <GoingButton
        show={{ ...SHOW, venueSlug: 'no-such-venue', venueName: 'Somewhere' }}
        state="going"
      />,
    );
    expect(container.querySelector('[data-going-cta-stamp-glyph]')).toBeNull();
    expect(
      container.querySelector('[data-going-cta-stamp-fallback]'),
    ).not.toBeNull();
  });
});
