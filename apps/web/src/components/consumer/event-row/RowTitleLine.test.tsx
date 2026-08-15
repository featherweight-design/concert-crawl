// @vitest-environment jsdom

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RowTitleLine } from './RowTitleLine'

describe('RowTitleLine', () => {
  it('renders the headliner alone when the surface carries no tour clause', () => {
    render(
      <RowTitleLine
        headliner="Wednesday"
        tourName="Rat Saw God Tour"
        showsTour={false}
      />,
    )
    expect(screen.getByTestId('row-title')).toHaveTextContent('Wednesday')
    expect(screen.queryByTestId('row-tour-clause')).not.toBeInTheDocument()
  })

  it('renders the tour clause when the surface takes one and the line holds it', () => {
    render(
      <RowTitleLine
        headliner="Wednesday"
        tourName="Rat Saw God Tour"
        showsTour
      />,
    )
    expect(screen.getByTestId('row-tour-clause')).toHaveTextContent(
      'Rat Saw God Tour',
    )
  })

  it('renders no clause when the show has no tour name', () => {
    render(<RowTitleLine headliner="Wednesday" tourName={null} showsTour />)
    expect(screen.queryByTestId('row-tour-clause')).not.toBeInTheDocument()
    // No clause means no measuring copies either — nothing to decide.
    expect(screen.getByTestId('row-title-line').children).toHaveLength(1)
  })

  it('hides the separator glyph from assistive tech', () => {
    render(
      <RowTitleLine
        headliner="Wednesday"
        tourName="Rat Saw God Tour"
        showsTour
      />,
    )
    const clause = screen.getByTestId('row-tour-clause')
    const glyph = clause.querySelector('[aria-hidden]')
    expect(glyph).not.toBeNull()
    // The clause's own text is not hidden — only the punctuation before it.
    expect(clause).toHaveTextContent('Rat Saw God Tour')
  })

  it('hides the measuring copies from assistive tech', () => {
    render(
      <RowTitleLine
        headliner="Wednesday"
        tourName="Rat Saw God Tour"
        showsTour
      />,
    )
    // Two copies of the headliner exist in the DOM; only one is announced.
    expect(screen.getAllByText('Wednesday')).toHaveLength(2)
    const box = screen.getByTestId('row-title-line')
    const hiddenCopies = Array.from(box.children).filter(
      (child) => child.getAttribute('aria-hidden') !== null,
    )
    expect(hiddenCopies).toHaveLength(1)
  })

  // Verified in Chromium: without the shell the nowrap measuring copy widens
  // the row's bordered ancestor at 5 of 6 column widths, and that overflow
  // propagates out to the document. jsdom cannot measure it, so the structure
  // is what the guard asserts.
  it('clips the measuring copies so they cannot widen any ancestor', () => {
    render(
      <RowTitleLine
        headliner="Godspeed You! Black Emperor and Friends"
        tourName="The Silver Cord Marathon World Tour 2026"
        showsTour
      />,
    )
    const box = screen.getByTestId('row-title-line')
    const shell = Array.from(box.children).find(
      (child) => child.getAttribute('aria-hidden') !== null,
    )
    expect(shell).toBeInstanceOf(HTMLElement)
    if (!(shell instanceof HTMLElement)) return
    expect(shell.style.overflow).toBe('hidden')
    expect(shell.style.width).toBe('0px')
    expect(shell.style.height).toBe('0px')
  })

  it('carries no status pill, no strike and no fallback title', () => {
    const { container } = render(
      <RowTitleLine
        headliner="Wednesday"
        tourName="Rat Saw God Tour"
        showsTour
      />,
    )
    expect(container.querySelector('p')).toBeNull()
    const title = screen.getByTestId('row-title')
    expect(title.style.textDecoration).toBe('')
  })

  it('takes the narrow step of the ramp at ≤360px', () => {
    const { rerender } = render(
      <RowTitleLine headliner="Wednesday" tourName={null} showsTour />,
    )
    expect(screen.getByTestId('row-title').style.fontSize).toBe('15.5px')
    rerender(
      <RowTitleLine headliner="Wednesday" tourName={null} showsTour narrow />,
    )
    expect(screen.getByTestId('row-title').style.fontSize).toBe('14.5px')
  })

  it('does not grow the line box when a tour clause is present', () => {
    // jsdom has no layout engine, so `offsetHeight` is 0 either way. The
    // equality still holds the contract that matters — the clause must not
    // introduce anything that could add a second line box — and it is backed
    // by the structural assertions below: the clause is a nowrap sibling of
    // the title inside one flex line, on the title's own leading.
    const { unmount } = render(
      <RowTitleLine headliner="Wednesday" tourName={null} showsTour />,
    )
    const without = screen.getByTestId('row-title-line').offsetHeight
    unmount()

    render(
      <RowTitleLine
        headliner="Wednesday"
        tourName="Rat Saw God Tour"
        showsTour
      />,
    )
    const box = screen.getByTestId('row-title-line')
    expect(box.offsetHeight).toBe(without)

    const clause = screen.getByTestId('row-tour-clause')
    expect(clause.parentElement).toBe(box)
    expect(clause.style.whiteSpace).toBe('nowrap')
    expect(clause.style.lineHeight).toBe(
      screen.getByTestId('row-title').style.lineHeight,
    )
    // Smaller than the headliner, so its own line box can never be the taller.
    expect(parseFloat(clause.style.fontSize)).toBeLessThan(
      parseFloat(screen.getByTestId('row-title').style.fontSize),
    )
  })
})
