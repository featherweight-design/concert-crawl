// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SupportingLine } from './SupportingLine';

describe('SupportingLine', () => {
  it('renders nothing with no artists', () => {
    const { container } = render(<SupportingLine artists={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('exposes the full roster to screen readers even when truncated', () => {
    render(<SupportingLine artists={['A', 'B', 'C', 'D']} maxInline={2} />);
    const group = screen.getByRole('group');
    expect(group.getAttribute('aria-label')).toBe('with A, B, C, and D');
  });

  it('shows a +N more tail when truncated', () => {
    render(<SupportingLine artists={['A', 'B', 'C', 'D']} maxInline={2} />);
    expect(screen.getByText('+2 more')).toBeDefined();
  });

  it('drops the separator for a single opener', () => {
    render(<SupportingLine artists={['Solo']} />);
    expect(screen.queryByText('·')).toBeNull();
  });

  it('clips the run to one line on card/hero surfaces', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="card" />,
    );
    const run = container.querySelector('span.min-w-0');
    expect(run?.className).toContain('truncate');
  });

  it('lets the full roster wrap on the detail surface', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="detail" />,
    );
    const run = container.querySelector('span.min-w-0');
    expect(run?.className).toContain('whitespace-normal');
    expect(run?.className).not.toContain('truncate');
  });

  // A wrapped detail bill stranded "with" at the left edge as its own flex
  // item while the names centred. It flows inline now, as one block, with
  // "with" inside the first name's block.
  it('flows the detail line as one inline run, lead and names together', () => {
    render(
      <SupportingLine
        artists={['Frost Children', 'Kavari', 'Izzy Camina', 'Sakr']}
        surface="detail"
      />,
    );
    const group = screen.getByRole('group');
    expect(group.className).not.toContain('flex');
    expect(group.className).toContain('text-balance');
    const [first] = screen.getAllByTestId('support-name');
    expect(first?.firstElementChild?.textContent).toBe('with');
    expect(first?.textContent).toBe('withFrost Children·');
  });

  // Each detail name is an inline-block, which a line never splits, and the
  // only break opportunities are the <wbr>s after each "·". The text keeps
  // plain ASCII spaces, so copy-paste and find-in-page see the real names.
  it('keeps each detail name whole and breaks only after a separator', () => {
    const { container } = render(
      <SupportingLine
        artists={['Frost Children', 'Kavari', 'Izzy Camina']}
        surface="detail"
      />,
    );
    const units = screen.getAllByTestId('support-name');
    expect(units.map((unit) => unit.textContent)).toEqual([
      'withFrost Children·',
      'Kavari·',
      'Izzy Camina',
    ]);
    for (const unit of units) {
      expect(unit.tagName).toBe('SPAN');
      expect(unit.className).toContain('inline-block');
      expect(unit.className).toContain('max-w-full');
    }
    const run = container.querySelector('span.min-w-0');
    expect(run?.textContent).toBe('withFrost Children·Kavari·Izzy Camina');
    expect(run?.textContent).not.toContain(' ');
    const breaks = container.querySelectorAll('wbr');
    expect(breaks).toHaveLength(2);
    breaks.forEach((node) => {
      expect(node.previousElementSibling?.textContent?.endsWith('·')).toBe(
        true,
      );
    });
  });

  // A "·" that would end a wrapped line is hidden (kept in layout); one that
  // sits mid-line stays visible.
  it('hides the separator of a unit that ends its wrapped line', () => {
    const top = vi
      .spyOn(HTMLElement.prototype, 'offsetTop', 'get')
      .mockImplementation(function (this: HTMLElement) {
        // Second name wraps onto a new line; the third stays with it.
        return this.textContent?.startsWith('Izzy') ||
          this.textContent?.startsWith('Kavari')
          ? 20
          : 0;
      });
    render(
      <SupportingLine
        artists={['Frost Children', 'Kavari', 'Izzy Camina']}
        surface="detail"
      />,
    );
    const seps = screen.getAllByTestId('support-sep');
    expect(seps[0]?.style.visibility).toBe('hidden');
    expect(seps[1]?.style.visibility).toBe('visible');
    top.mockRestore();
  });

  // max-width 100% on the block: a single name wider than the line wraps
  // inside its own block rather than overflow.
  it('caps a single overlong detail name at the line so it wraps inside', () => {
    render(
      <SupportingLine
        artists={['The Extraordinarily Long Named Ensemble']}
        surface="detail"
      />,
    );
    const [unit] = screen.getAllByTestId('support-name');
    expect(unit?.className).toContain('inline-block');
    expect(unit?.className).toContain('max-w-full');
    expect(unit?.textContent).toBe(
      'withThe Extraordinarily Long Named Ensemble',
    );
  });

  it('puts the detail +N more tail in its own block after a break', () => {
    const { container } = render(
      <SupportingLine
        artists={['A', 'B', 'C']}
        maxInline={2}
        surface="detail"
      />,
    );
    expect(
      screen.getAllByTestId('support-name').map((unit) => unit.textContent),
    ).toEqual(['withA·', 'B·']);
    const tail = screen.getByText('+1 more').parentElement;
    expect(tail?.className).toContain('inline-block');
    expect(tail?.previousElementSibling?.tagName).toBe('WBR');
    expect(container.querySelectorAll('wbr')).toHaveLength(2);
  });

  it('leaves card names and their markup untouched', () => {
    const { container } = render(
      <SupportingLine artists={['Izzy Camina', 'Sakr']} surface="card" />,
    );
    expect(container.querySelector('span.min-w-0')?.textContent).toBe(
      'Izzy Camina·Sakr',
    );
    expect(container.querySelectorAll('wbr')).toHaveLength(0);
    expect(screen.queryAllByTestId('support-name')).toHaveLength(0);
  });

  it('keeps the card line a single flex row', () => {
    render(<SupportingLine artists={['A', 'B']} surface="card" />);
    expect(screen.getByRole('group').className).toContain('flex');
  });
});

// #1115 PR-G — opt-in artist-page links. Only the detail surface passes
// `linkArtists`; card and hero stay exactly as they were.
describe('SupportingLine — artist links (#1115 PR-G)', () => {
  it('renders no anchors by default', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} slugs={['a-slug', 'b-slug']} />,
    );
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('links only the names that have a slug', () => {
    const { container } = render(
      <SupportingLine
        artists={['Linked Act', 'Unlinked Act']}
        slugs={['linked-act', null]}
        surface="detail"
        linkArtists
      />,
    );
    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('/artists/linked-act');
    expect(links[0]?.textContent).toBe('Linked Act');
    // The unlinked name is still on the page — as plain text.
    expect(screen.getByText('Unlinked Act').tagName).not.toBe('A');
  });

  it('renders plain text when linkArtists is on but no slugs were supplied', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="detail" linkArtists />,
    );
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('ignores slugs past the end of a truncated run', () => {
    const { container } = render(
      <SupportingLine
        artists={['A', 'B', 'C']}
        slugs={['a-slug', 'b-slug', 'c-slug']}
        maxInline={2}
        surface="detail"
        linkArtists
      />,
    );
    const hrefs = Array.from(container.querySelectorAll('a')).map((anchor) =>
      anchor.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/artists/a-slug', '/artists/b-slug']);
  });

  it('never places a focusable link inside an aria-hidden subtree', () => {
    const { container } = render(
      <SupportingLine
        artists={['Linked Act', 'Other Act']}
        slugs={['linked-act', 'other-act']}
        surface="detail"
        linkArtists
      />,
    );
    for (const anchor of container.querySelectorAll('a')) {
      expect(anchor.closest('[aria-hidden="true"]')).toBeNull();
    }
  });

  it('keeps the aria-hidden visual run when not linking', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="card" />,
    );
    const run = container.querySelector('span.min-w-0');
    expect(run?.getAttribute('aria-hidden')).toBe('true');
  });

  it('leaves the composed group label untouched when linking', () => {
    render(
      <SupportingLine
        artists={['A', 'B', 'C']}
        slugs={['a-slug', null, 'c-slug']}
        surface="detail"
        linkArtists
      />,
    );
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(
      'with A, B, and C',
    );
  });

  it('keeps the detail run wrapping and card/hero truncated when linking', () => {
    const { container: detail } = render(
      <SupportingLine
        artists={['A']}
        slugs={['a-slug']}
        surface="detail"
        linkArtists
      />,
    );
    expect(detail.querySelector('span.min-w-0')?.className).toContain(
      'whitespace-normal',
    );

    const { container: card } = render(
      <SupportingLine artists={['A']} slugs={['a-slug']} surface="card" />,
    );
    expect(card.querySelector('span.min-w-0')?.className).toContain('truncate');
  });

  it('does not change the name font size when a name becomes a link', () => {
    const { container: plain } = render(
      <SupportingLine artists={['A']} surface="detail" />,
    );
    const { container: linked } = render(
      <SupportingLine
        artists={['A']}
        slugs={['a-slug']}
        surface="detail"
        linkArtists
      />,
    );
    const plainName = plain.querySelector('span.font-semibold');
    const linkedName = linked.querySelector('a');
    expect(linkedName?.getAttribute('style')).toBe(
      plainName?.getAttribute('style'),
    );
  });

  // The band draws artwork behind this line, and `--fg-subtle` measures
  // 3.49:1 on flat ground before any art is composited over it. Nothing on
  // the detail surface may reach for it.
  it('never uses the subtle token on the surface that sits over artwork', () => {
    const { container } = render(
      <SupportingLine
        surface="detail"
        artists={['A', 'B', 'C']}
        maxInline={2}
        dim
      />,
    );
    expect(container.querySelectorAll('.text-fg-subtle')).toHaveLength(0);
    // …and the elements that would have carried it are still rendered, so
    // this cannot pass by the line having quietly stopped drawing them.
    expect(container.textContent).toContain('with');
    expect(container.querySelectorAll('.text-fg-muted').length).toBeGreaterThan(
      3,
    );
  });

  it('leaves the row and card surfaces on the token they shipped with', () => {
    for (const surface of ['card', 'hero'] as const) {
      const { container, unmount } = render(
        <SupportingLine surface={surface} artists={['A', 'B']} />,
      );
      expect(
        container.querySelectorAll('.text-fg-subtle').length,
      ).toBeGreaterThan(0);
      unmount();
    }
  });
});
