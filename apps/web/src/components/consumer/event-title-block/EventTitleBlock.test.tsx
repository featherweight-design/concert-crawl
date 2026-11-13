// @vitest-environment jsdom

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EventTitleBlock } from './EventTitleBlock';

describe('EventTitleBlock', () => {
  it('renders headliner + openers', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT']}
        tourName={null}
        surface="detail"
      />,
    );
    expect(screen.getByText('Wednesday')).toBeInTheDocument();
    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-label',
      'with Hotline TNT',
    );
  });

  it('renders the tour name as a kicker', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName="Rat Saw God Tour"
        surface="detail"
      />,
    );
    expect(screen.getByText('Rat Saw God Tour')).toBeInTheDocument();
  });

  it('falls back to the legacy title for legacy rows (supportingArtists === null)', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={null}
        tourName={null}
        fallbackTitle="Wednesday + Hotline TNT / MJ Lenderman"
        surface="detail"
      />,
    );
    expect(
      screen.getByText('Wednesday + Hotline TNT / MJ Lenderman'),
    ).toBeInTheDocument();
  });

  it('suppresses the legacy fallback for freshly extracted solo shows (supportingArtists === [])', () => {
    // `[]` means the crawler ran and found no openers — the headliner alone is
    // correct, so the run-on `fallbackTitle` must NOT reappear even when it
    // differs from the headliner (e.g. carries promoter/presenter text).
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        fallbackTitle="AEG Presents Wednesday"
        surface="detail"
      />,
    );
    expect(
      screen.queryByText('AEG Presents Wednesday'),
    ).not.toBeInTheDocument();
  });

  it('omits the legacy fallback when it equals the headliner', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={null}
        tourName={null}
        fallbackTitle="Wednesday"
        surface="detail"
      />,
    );
    expect(screen.queryByText('Wednesday')).toBeInTheDocument();
    // headliner is present exactly once — no duplicate fallback paragraph
    expect(screen.getAllByText('Wednesday')).toHaveLength(1);
  });

  it('renders the headliner as an <h1> when headlinerAs="h1"', () => {
    render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        headlinerAs="h1"
        surface="detail"
      />,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Wednesday' }),
    ).toBeInTheDocument();
  });

  it('sizes the headline from headSize when passed, else from the surface ramp', () => {
    const { rerender } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        headlinerAs="h1"
        surface="detail"
        headSize="48px"
      />,
    );
    expect(screen.getByRole('heading', { level: 1 }).style.fontSize).toBe(
      '48px',
    );
    rerender(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        headlinerAs="h1"
        surface="detail"
      />,
    );
    expect(screen.getByRole('heading', { level: 1 }).style.fontSize).toBe(
      '34px',
    );
  });

  it('wraps at spaces and never breaks inside a word (addendum 3 rule 2)', () => {
    render(
      <EventTitleBlock
        headliner="Superorganism"
        supportingArtists={[]}
        tourName={null}
        headlinerAs="h1"
        surface="detail"
      />,
    );
    const title = screen.getByRole('heading', { level: 1 });
    expect(title.style.wordBreak).toBe('normal');
    expect(title.style.overflowWrap).toBe('normal');
  });

  it('centers the block on mobile and returns it to the start edge from sm only when centered', () => {
    const centeredClasses = [
      'items-center',
      'text-center',
      'sm:items-start',
      'sm:text-left',
    ];
    const { rerender } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        headlinerAs="h1"
        surface="detail"
        centered
      />,
    );
    const block = () => screen.getByRole('heading', { level: 1 }).parentElement;
    expect(block()).toHaveClass(...centeredClasses);
    rerender(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        headlinerAs="h1"
        surface="detail"
      />,
    );
    for (const cls of centeredClasses) expect(block()).not.toHaveClass(cls);
  });

  // B+ reverses the old no-strike rule on the event page: the board
  // (`08-prices-and-status/more-st-ev_canc_m`) strikes a cancelled title and
  // draws the status chip under it. Postponed is never struck, and the hero
  // card keeps its words.
  it('strikes a cancelled headliner on the detail surface only', () => {
    const { rerender } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        status="cancelled"
        headlinerAs="h1"
        surface="detail"
      />,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveStyle({
      textDecoration: 'line-through',
    });
    rerender(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        status="cancelled"
        headlinerAs="h1"
        surface="hero"
      />,
    );
    expect(screen.getByRole('heading', { level: 1 }).style.textDecoration).toBe(
      '',
    );
    rerender(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName={null}
        status="postponed"
        headlinerAs="h1"
        surface="detail"
      />,
    );
    expect(screen.getByRole('heading', { level: 1 }).style.textDecoration).toBe(
      '',
    );
  });

  it('draws the detail status chip after the title, the hero chip before it', () => {
    const { rerender } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName="Tour"
        status="cancelled"
        headlinerAs="h1"
        surface="detail"
      />,
    );
    let heading = screen.getByRole('heading', { level: 1 });
    let chip = screen.getByText(/cancelled/i);
    expect(
      heading.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    rerender(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={[]}
        tourName="Tour"
        status="cancelled"
        headlinerAs="h1"
        surface="hero"
      />,
    );
    heading = screen.getByRole('heading', { level: 1 });
    chip = screen.getByText(/cancelled/i);
    expect(
      heading.compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it('keeps the detail status chip as the last line of the block, after the openers', () => {
    const { container } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT']}
        tourName={null}
        status="cancelled"
        headlinerAs="h1"
        surface="detail"
      />,
    );
    const block = container.firstElementChild as HTMLElement;
    const chip = screen.getByText(/cancelled/i);
    expect(block.lastElementChild).toContainElement(chip);
    expect(block.lastElementChild).not.toContainElement(
      screen.getByRole('heading', { level: 1 }),
    );
    expect(screen.getByText('Hotline TNT')).toBeInTheDocument();
  });
});

// #1115 PR-G — the block can link the whole bill to artist pages, opt-in.
describe('EventTitleBlock — artist links (#1115 PR-G)', () => {
  it('renders no anchors without linkArtists, however many slugs are supplied', () => {
    const { container } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT']}
        tourName={null}
        artistSlug="wednesday"
        supportingArtistSlugs={['hotline-tnt']}
        surface="hero"
      />,
    );
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('renders no anchors on the detail surface until linkArtists is set', () => {
    const { container } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT']}
        tourName={null}
        artistSlug="wednesday"
        supportingArtistSlugs={['hotline-tnt']}
        surface="detail"
      />,
    );
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('links the headliner and openers on the detail surface', () => {
    const { container } = render(
      <EventTitleBlock
        headliner="Wednesday"
        supportingArtists={['Hotline TNT', 'No Page Act']}
        tourName={null}
        artistSlug="wednesday"
        supportingArtistSlugs={['hotline-tnt', null]}
        surface="detail"
        headlinerAs="h1"
        linkArtists
      />,
    );
    const hrefs = Array.from(container.querySelectorAll('a')).map((anchor) =>
      anchor.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/artists/wednesday', '/artists/hotline-tnt']);
    // The heading is still the heading — the link lives inside it.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Wednesday',
    );
  });

  it('leaves the headliner as plain text when it has no slug', () => {
    const { container } = render(
      <EventTitleBlock
        headliner="Unprojected Act"
        supportingArtists={[]}
        tourName={null}
        artistSlug={null}
        supportingArtistSlugs={[]}
        surface="detail"
        headlinerAs="h1"
        linkArtists
      />,
    );
    expect(container.querySelectorAll('a')).toHaveLength(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Unprojected Act',
    );
  });

  // A long presenter line overflowed the 320px stage and clipped at both
  // edges. On the detail surface it wraps inside the column.
  it('wraps the tour line inside the column on the detail surface', () => {
    const tour = "Presents Stick Figure at Fiddler's Green Amphitheatre";
    const { unmount } = render(
      <EventTitleBlock
        headliner="Stick Figure"
        supportingArtists={[]}
        tourName={tour}
        surface="detail"
        centered
      />,
    );
    const line = screen.getByText(tour);
    expect(line.className).toContain('whitespace-normal');
    expect(line.className).not.toContain('truncate');
    expect(line.parentElement?.className).toContain('max-w-full');
    expect(line.parentElement?.className).toContain('justify-center');
    unmount();

    render(
      <EventTitleBlock
        headliner="Stick Figure"
        supportingArtists={[]}
        tourName={tour}
        surface="hero"
      />,
    );
    expect(screen.getByText(tour).className).toContain('truncate');
  });

  describe('status: cancelled', () => {
    const renderCancelled = (delistedAt: string | null) =>
      render(
        <EventTitleBlock
          headliner="Wednesday"
          supportingArtists={[]}
          tourName={null}
          surface="detail"
          status="cancelled"
          delistedAt={delistedAt}
        />,
      );

    it('strikes the title of a confirmed cancellation', () => {
      renderCancelled(null);
      expect(screen.getByText('Wednesday').style.textDecoration).toBe(
        'line-through',
      );
    });

    it('strikes a confirmed cancellation with a 3px line and dims it', () => {
      renderCancelled(null);
      const title = screen.getByText('Wednesday');
      expect(title.style.textDecorationThickness).toBe('3px');
      expect(title.className).toContain('text-fg-muted');
    });

    it('stacks the genre chip above the status pill', () => {
      render(
        <EventTitleBlock
          headliner="Wednesday"
          supportingArtists={[]}
          tourName={null}
          surface="detail"
          status="cancelled"
          beforePill={<span data-testid="chips">Rock</span>}
        />,
      );
      const chips = screen.getByTestId('chips');
      const pill = screen.getByText(/cancelled/i);
      expect(
        chips.compareDocumentPosition(pill) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('keeps a No longer listed title at full strength and unstruck', () => {
      renderCancelled('2026-11-04T10:00:00.000Z');
      const title = screen.getByText('Wednesday');
      expect(title.style.textDecoration).toBe('');
      expect(title.className).not.toContain('text-fg-muted');
    });

    it('draws no chip under a No longer listed title when the page draws the card below, and one when it does not', () => {
      const { unmount } = render(
        <EventTitleBlock
          headliner="Wednesday"
          supportingArtists={[]}
          tourName={null}
          surface="detail"
          status="cancelled"
          delistedAt="2026-11-04T10:00:00.000Z"
          delistedCardBelow
        />,
      );
      expect(screen.queryByTestId('status-pill-removed')).toBeNull();
      unmount();

      renderCancelled('2026-11-04T10:00:00.000Z');
      expect(screen.getByTestId('status-pill-removed')).toBeDefined();
    });

    // event-nll-d draws the chip above the title in the hero; event-nll-m
    // draws none there, the card below carries it.
    it('draws the No longer listed chip above the title from sm up only', () => {
      render(
        <EventTitleBlock
          headliner="Wednesday"
          supportingArtists={[]}
          tourName={null}
          surface="detail"
          status="cancelled"
          delistedAt="2026-11-04T10:00:00.000Z"
          delistedCardBelow
        />,
      );
      const slot = screen.getByTestId('title-nll-chip');
      expect(slot.className).toContain('hidden');
      expect(slot.className).toContain('sm:flex');
      expect(slot.style.marginBottom).toBe('9px');
      expect(slot.textContent).toBe('No longer listed');
      // Over the photo wash the chip steps up: a visible grey border (50%) and
      // the muted text token, not the faint subtle one.
      const chip = screen.getByTestId('nll-chip');
      expect(chip.style.border).toContain('var(--fg-muted)');
      expect(chip.style.border).toContain('50%');
      expect(chip.style.color).toBe('var(--fg-muted)');
      // Announced once, by the card below, never by the hero chip too.
      expect(slot.getAttribute('aria-hidden')).toBe('true');
      expect(slot.closest('[role="status"]')).toBeNull();
      expect(slot.querySelector('[role="status"]')).toBeNull();
      const title = screen.getByText('Wednesday');
      expect(
        slot.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('draws no hero chip for a confirmed cancellation or without the card below', () => {
      const { unmount } = render(
        <EventTitleBlock
          headliner="Wednesday"
          supportingArtists={[]}
          tourName={null}
          surface="detail"
          status="cancelled"
          delistedAt={null}
          delistedCardBelow
        />,
      );
      expect(screen.queryByTestId('title-nll-chip')).toBeNull();
      unmount();

      renderCancelled('2026-11-04T10:00:00.000Z');
      expect(screen.queryByTestId('title-nll-chip')).toBeNull();
    });

    it('keeps a postponed title at full strength', () => {
      render(
        <EventTitleBlock
          headliner="Wednesday"
          supportingArtists={[]}
          tourName={null}
          surface="detail"
          status="postponed"
          delistedAt={null}
        />,
      );
      expect(screen.getByText('Wednesday').className).not.toContain(
        'text-fg-muted',
      );
    });
  });
});
