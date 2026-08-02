// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SupportingLine } from './SupportingLine'

describe('SupportingLine', () => {
  it('renders nothing with no artists', () => {
    const { container } = render(<SupportingLine artists={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('exposes the full roster to screen readers even when truncated', () => {
    render(<SupportingLine artists={['A', 'B', 'C', 'D']} maxInline={2} />)
    const group = screen.getByRole('group')
    expect(group.getAttribute('aria-label')).toBe('with A, B, C, and D')
  })

  it('shows a +N more tail when truncated', () => {
    render(<SupportingLine artists={['A', 'B', 'C', 'D']} maxInline={2} />)
    expect(screen.getByText('+2 more')).toBeDefined()
  })

  it('drops the separator for a single opener', () => {
    render(<SupportingLine artists={['Solo']} />)
    expect(screen.queryByText('·')).toBeNull()
  })

  it('clips the run to one line on card/hero surfaces', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="card" />,
    )
    const run = container.querySelector('span.min-w-0')
    expect(run?.className).toContain('truncate')
  })

  it('lets the full roster wrap on the detail surface', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="detail" />,
    )
    const run = container.querySelector('span.min-w-0')
    expect(run?.className).toContain('whitespace-normal')
    expect(run?.className).not.toContain('truncate')
  })
})

// #1115 PR-G — opt-in artist-page links. Only the detail surface passes
// `linkArtists`; card and hero stay exactly as they were.
describe('SupportingLine — artist links (#1115 PR-G)', () => {
  it('renders no anchors by default', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} slugs={['a-slug', 'b-slug']} />,
    )
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('links only the names that have a slug', () => {
    const { container } = render(
      <SupportingLine
        artists={['Linked Act', 'Unlinked Act']}
        slugs={['linked-act', null]}
        surface="detail"
        linkArtists
      />,
    )
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(1)
    expect(links[0]?.getAttribute('href')).toBe('/artists/linked-act')
    expect(links[0]?.textContent).toBe('Linked Act')
    // The unlinked name is still on the page — as plain text.
    expect(screen.getByText('Unlinked Act').tagName).not.toBe('A')
  })

  it('renders plain text when linkArtists is on but no slugs were supplied', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="detail" linkArtists />,
    )
    expect(container.querySelectorAll('a')).toHaveLength(0)
  })

  it('ignores slugs past the end of a truncated run', () => {
    const { container } = render(
      <SupportingLine
        artists={['A', 'B', 'C']}
        slugs={['a-slug', 'b-slug', 'c-slug']}
        maxInline={2}
        surface="detail"
        linkArtists
      />,
    )
    const hrefs = Array.from(container.querySelectorAll('a')).map((anchor) =>
      anchor.getAttribute('href'),
    )
    expect(hrefs).toEqual(['/artists/a-slug', '/artists/b-slug'])
  })

  it('never places a focusable link inside an aria-hidden subtree', () => {
    const { container } = render(
      <SupportingLine
        artists={['Linked Act', 'Other Act']}
        slugs={['linked-act', 'other-act']}
        surface="detail"
        linkArtists
      />,
    )
    for (const anchor of container.querySelectorAll('a')) {
      expect(anchor.closest('[aria-hidden="true"]')).toBeNull()
    }
  })

  it('keeps the aria-hidden visual run when not linking', () => {
    const { container } = render(
      <SupportingLine artists={['A', 'B']} surface="card" />,
    )
    const run = container.querySelector('span.min-w-0')
    expect(run?.getAttribute('aria-hidden')).toBe('true')
  })

  it('leaves the composed group label untouched when linking', () => {
    render(
      <SupportingLine
        artists={['A', 'B', 'C']}
        slugs={['a-slug', null, 'c-slug']}
        surface="detail"
        linkArtists
      />,
    )
    expect(screen.getByRole('group').getAttribute('aria-label')).toBe(
      'with A, B, and C',
    )
  })

  it('keeps the detail run wrapping and card/hero truncated when linking', () => {
    const { container: detail } = render(
      <SupportingLine
        artists={['A']}
        slugs={['a-slug']}
        surface="detail"
        linkArtists
      />,
    )
    expect(detail.querySelector('span.min-w-0')?.className).toContain(
      'whitespace-normal',
    )

    const { container: card } = render(
      <SupportingLine artists={['A']} slugs={['a-slug']} surface="card" />,
    )
    expect(card.querySelector('span.min-w-0')?.className).toContain('truncate')
  })

  it('does not change the name font size when a name becomes a link', () => {
    const { container: plain } = render(
      <SupportingLine artists={['A']} surface="detail" />,
    )
    const { container: linked } = render(
      <SupportingLine
        artists={['A']}
        slugs={['a-slug']}
        surface="detail"
        linkArtists
      />,
    )
    const plainName = plain.querySelector('span.font-semibold')
    const linkedName = linked.querySelector('a')
    expect(linkedName?.getAttribute('style')).toBe(
      plainName?.getAttribute('style'),
    )
  })
})
